/**
 * Hybrid retrieval over the literature library: vector search (sqlite-vec, Voyage
 * embeddings) and full-text search (FTS5 / BM25), merged with Reciprocal Rank Fusion.
 */
import type Database from "better-sqlite3";
import { reciprocalRankFusion, toFtsQuery } from "./fusion";
import type { EmbedderInfo } from "./embed-types";

export type Passage = {
  /** Stable id used as the citation `source`, e.g. "library:1234". */
  id: string;
  title: string;
  authors: string;
  year: number | null;
  url: string;
  license: string;
  section: string;
  text: string;
  /** Page number, for cabinet uploads. */
  page?: number | null;
};

const CANDIDATES = 30;

function toBlob(v: Int8Array) {
  return Buffer.from(v.buffer, v.byteOffset, v.byteLength);
}

/** Ranked chunk ids from one library, by vector distance and by BM25. */
function rankLibrary(db: Database.Database, embedding: Int8Array, ftsQuery: string | null) {
  const byVector = db
    .prepare("SELECT rowid FROM chunks_vec WHERE embedding MATCH vec_int8(?) AND k = ? ORDER BY distance")
    .all(toBlob(embedding), CANDIDATES)
    .map((r) => Number((r as { rowid: number | bigint }).rowid));
  const byText = ftsQuery
    ? db
        .prepare("SELECT rowid FROM chunks_fts WHERE chunks_fts MATCH ? ORDER BY rank LIMIT ?")
        .all(ftsQuery, CANDIDATES)
        .map((r) => Number((r as { rowid: number | bigint }).rowid))
    : [];
  return { byVector, byText };
}

function loadPassages(db: Database.Database, ids: number[]): Map<number, Passage> {
  if (ids.length === 0) return new Map();
  const rows = db
    .prepare(
      `SELECT c.id, c.section, c.text, d.title, d.authors, d.year, d.url, d.license
       FROM chunks c JOIN documents d ON d.id = c.document_id
       WHERE c.id IN (${ids.map(() => "?").join(",")})`,
    )
    .all(...ids) as { id: number; section: string; text: string; title: string; authors: string; year: number | null; url: string; license: string }[];
  return new Map(
    rows.map((r) => [
      r.id,
      { id: `library:${r.id}`, title: r.title, authors: r.authors, year: r.year, url: r.url, license: r.license, section: r.section, text: r.text },
    ]),
  );
}

/**
 * Whether the library was built with this embedding model (vectors from different
 * models are not comparable). A library without metadata (tests) is accepted.
 */
export function libraryMatches(db: Database.Database, model: string): boolean {
  const row = db.prepare("SELECT value FROM meta WHERE key = 'embed_model'").get() as { value: string } | undefined;
  if (row && row.value !== model) {
    console.warn(`[expert] library.db was built with ${row.value}, search uses ${model}: library skipped`);
    return false;
  }
  return true;
}

export async function searchLibrary(
  db: Database.Database | null,
  query: string,
  { embedder, limit = 8 }: { embedder: EmbedderInfo; limit?: number },
): Promise<Passage[]> {
  if (!db || !libraryMatches(db, embedder.model)) return [];
  const [embedding] = await embedder.embed([query], "query");
  const { byVector, byText } = rankLibrary(db, embedding, toFtsQuery(query));
  const ids = reciprocalRankFusion([byVector, byText], { limit });
  const passages = loadPassages(db, ids);
  return ids.map((id) => passages.get(id)).filter((p): p is Passage => Boolean(p));
}

/** Ranked chunk ids from a cabinet's uploads (vector search is partitioned by account). */
function rankUploads(db: Database.Database, accountId: string, embedding: Int8Array, model: string, ftsQuery: string | null) {
  const nearest = db
    .prepare("SELECT rowid FROM document_chunks_vec WHERE embedding MATCH vec_int8(?) AND k = ? AND account_id = ? ORDER BY distance")
    .all(toBlob(embedding), CANDIDATES, accountId)
    .map((r) => Number((r as { rowid: number | bigint }).rowid));
  // Keep only vectors made by the same embedding model, in distance order.
  const sameModel = nearest.length
    ? new Set(
        (
          db
            .prepare(
              `SELECT c.id FROM document_chunks c JOIN documents d ON d.id = c.document_id
               WHERE d.embed_model = ? AND c.id IN (${nearest.map(() => "?").join(",")})`,
            )
            .all(model, ...nearest) as { id: number }[]
        ).map((r) => r.id),
      )
    : new Set<number>();
  const byVector = nearest.filter((id) => sameModel.has(id));
  const byText = ftsQuery
    ? db
        .prepare(
          `SELECT f.rowid FROM document_chunks_fts f JOIN document_chunks c ON c.id = f.rowid
           WHERE document_chunks_fts MATCH ? AND c.account_id = ? ORDER BY f.rank LIMIT ?`,
        )
        .all(ftsQuery, accountId, CANDIDATES)
        .map((r) => Number((r as { rowid: number | bigint }).rowid))
    : [];
  return { byVector, byText };
}

function loadUploadPassages(db: Database.Database, accountId: string, ids: number[]): Map<number, Passage> {
  if (ids.length === 0) return new Map();
  const rows = db
    .prepare(
      `SELECT c.id, c.page, c.text, d.id AS document_id, d.title
       FROM document_chunks c JOIN documents d ON d.id = c.document_id
       WHERE c.account_id = ? AND c.id IN (${ids.map(() => "?").join(",")})`,
    )
    .all(accountId, ...ids) as { id: number; page: number | null; text: string; document_id: string; title: string }[];
  return new Map(
    rows.map((r) => [
      r.id,
      {
        id: `upload:${r.id}`,
        title: r.title,
        authors: "",
        year: null,
        url: `/expert/library?doc=${r.document_id}${r.page ? `&page=${r.page}` : ""}`,
        license: "cabinet",
        section: r.page ? `p. ${r.page}` : "",
        text: r.text,
        page: r.page,
      },
    ]),
  );
}

/**
 * Searches the shared library and the cabinet's own uploads with one query
 * embedding, and fuses the four ranked lists into one.
 */
export async function searchLiterature(
  sources: { library: Database.Database | null; uploads: Database.Database; accountId: string },
  query: string,
  { embedder, limit = 8 }: { embedder: EmbedderInfo; limit?: number },
): Promise<Passage[]> {
  const [embedding] = await embedder.embed([query], "query");
  const fts = toFtsQuery(query);
  const lists: string[][] = [];
  const library = sources.library && libraryMatches(sources.library, embedder.model) ? sources.library : null;
  if (library) {
    const lib = rankLibrary(library, embedding, fts);
    lists.push(lib.byVector.map((id) => `L:${id}`), lib.byText.map((id) => `L:${id}`));
  }
  const up = rankUploads(sources.uploads, sources.accountId, embedding, embedder.model, fts);
  lists.push(up.byVector.map((id) => `U:${id}`), up.byText.map((id) => `U:${id}`));

  const keys = reciprocalRankFusion(lists, { limit });
  const ids = (prefix: string) => keys.filter((k) => k.startsWith(prefix)).map((k) => Number(k.slice(2)));
  const fromLibrary = library ? loadPassages(library, ids("L:")) : new Map<number, Passage>();
  const fromUploads = loadUploadPassages(sources.uploads, sources.accountId, ids("U:"));
  return keys
    .map((k) => (k.startsWith("L:") ? fromLibrary : fromUploads).get(Number(k.slice(2))))
    .filter((p): p is Passage => Boolean(p));
}
