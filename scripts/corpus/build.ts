/**
 * Builds the shared literature library (data/library.db) from the PubMed Central
 * articles downloaded by fetch-pmc.ts: extracts the useful sections, splits them
 * into passages, embeds them with Voyage and writes the FTS + vector indexes.
 *
 * Embeddings are cached in data/corpus/embed-cache.db (keyed by text hash), so a
 * rebuild or an interrupted run never pays twice.
 *
 *   pnpm corpus:build
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import * as sqliteVec from "sqlite-vec";
import { chunkParagraphs, indexedText, type Paragraph } from "../../src/lib/expert/chunking";
import { createLibrarySchema, insertLibraryDocument, type LibraryDocument } from "../../src/lib/expert/library-schema";
import { EMBED_DIMS, type EmbedderInfo } from "../../src/lib/expert/embed-types";
import { activeEmbedder } from "../../src/lib/expert/embeddings";

const CORPUS_DIR = path.join(process.cwd(), "data", "corpus");
const RAW_DIR = path.join(CORPUS_DIR, "raw");
const OUT = path.join(process.cwd(), "data", "library.db");

/** BioC section types worth citing in practice (methods, references, tables… are skipped). */
const SECTIONS: Record<string, string> = {
  ABSTRACT: "Abstract",
  INTRO: "Introduction",
  CASE: "Case report",
  RESULTS: "Results",
  DISCUSS: "Discussion",
  CONCL: "Conclusion",
};

type BiocPassage = { infons: Record<string, string>; text: string };

function licenseLabel(text: string | undefined): string | null {
  if (!text) return null;
  const t = text.toLowerCase();
  // Paid product: anything non-commercial is excluded.
  if (/non-?commercial|by-nc|cc by-nc/.test(t)) return null;
  if (/cc0|public domain/.test(t)) return "CC0";
  if (/attribution|cc by|creativecommons\.org\/licenses\/by\//.test(t)) return "CC BY";
  return null;
}

function authorsOf(infons: Record<string, string>): string {
  const surnames = Object.keys(infons)
    .filter((k) => k.startsWith("name_"))
    .sort((a, b) => Number(a.slice(5)) - Number(b.slice(5)))
    .map((k) => /surname:([^;]+)/.exec(infons[k])?.[1]?.trim())
    .filter(Boolean) as string[];
  if (surnames.length === 0) return "";
  return surnames.length > 3 ? `${surnames.slice(0, 3).join(", ")} et al.` : surnames.join(", ");
}

/** Parses one BioC article into library metadata and section paragraphs; null when unusable. */
function parseArticle(raw: string, sourceId: string): { doc: LibraryDocument; paragraphs: Paragraph[] } | null {
  let json;
  try {
    json = JSON.parse(raw);
  } catch {
    return null; // an error page saved by an older fetch
  }
  const passages: BiocPassage[] = (Array.isArray(json) ? json[0] : json).documents[0].passages;
  const front = passages[0];
  const license = licenseLabel(front.infons.license);
  if (!license) return null;

  const paragraphs: Paragraph[] = [];
  let heading = "";
  let lastType = "";
  for (const p of passages) {
    const sectionType = p.infons.section_type;
    const type = p.infons.type ?? "";
    if (sectionType !== lastType) {
      heading = "";
      lastType = sectionType;
    }
    if (!SECTIONS[sectionType]) continue;
    if (type.includes("title")) {
      heading = p.text.trim();
      continue;
    }
    if (type !== "paragraph" && type !== "abstract") continue;
    const base = SECTIONS[sectionType];
    const section = heading && heading.toLowerCase() !== base.toLowerCase() ? `${base} — ${heading}` : base;
    paragraphs.push({ section, text: p.text });
  }
  if (paragraphs.length === 0) return null;

  const year = Number(front.infons.year);
  return {
    doc: {
      sourceId,
      title: front.text.trim(),
      authors: authorsOf(front.infons),
      year: Number.isFinite(year) && year > 1900 ? year : null,
      doi: front.infons["article-id_doi"] ?? null,
      url: `https://pmc.ncbi.nlm.nih.gov/articles/${sourceId}/`,
      license,
    },
    paragraphs,
  };
}

function openEmbedCache() {
  const cache = new Database(path.join(CORPUS_DIR, "embed-cache.db"));
  cache.exec("CREATE TABLE IF NOT EXISTS embeddings (hash TEXT PRIMARY KEY, vec BLOB NOT NULL)");
  return cache;
}

const hashOf = (model: string, text: string) => crypto.createHash("sha256").update(`${model}:${EMBED_DIMS}:${text}`).digest("hex");

/** Embeds texts, reusing cached vectors and embedding only the missing ones. */
async function embedAll(cache: Database.Database, embedder: EmbedderInfo, texts: string[]): Promise<Int8Array[]> {
  const get = cache.prepare("SELECT vec FROM embeddings WHERE hash = ?");
  const put = cache.prepare("INSERT OR REPLACE INTO embeddings (hash, vec) VALUES (?, ?)");
  const hashes = texts.map((t) => hashOf(embedder.model, t));
  const missing = texts.map((t, i) => ({ t, i })).filter(({ i }) => !get.get(hashes[i]));

  const BATCH = 64;
  for (let b = 0; b < missing.length; b += BATCH) {
    const batch = missing.slice(b, b + BATCH);
    const vectors = await embedder.embed(batch.map((m) => m.t), "document");
    cache.transaction(() => batch.forEach((m, j) => put.run(hashes[m.i], Buffer.from(vectors[j].buffer))))();
    process.stdout.write(`\r  embedded ${Math.min(b + BATCH, missing.length)}/${missing.length} new passages`);
  }
  if (missing.length) process.stdout.write("\n");

  return hashes.map((h) => {
    const row = get.get(h) as { vec: Buffer };
    return new Int8Array(row.vec.buffer, row.vec.byteOffset, row.vec.byteLength);
  });
}

async function main() {
  const files = fs.existsSync(RAW_DIR) ? fs.readdirSync(RAW_DIR).filter((f) => f.endsWith(".json")) : [];
  if (files.length === 0) throw new Error("No articles in data/corpus/raw — run `pnpm corpus:fetch` first.");

  const articles: { doc: LibraryDocument; chunks: ReturnType<typeof chunkParagraphs>; indexed: string[] }[] = [];
  let rejected = 0;
  for (const file of files.sort()) {
    const parsed = parseArticle(fs.readFileSync(path.join(RAW_DIR, file), "utf8"), file.replace(".json", ""));
    if (!parsed) {
      rejected++;
      continue;
    }
    const chunks = chunkParagraphs(parsed.paragraphs);
    articles.push({ doc: parsed.doc, chunks, indexed: chunks.map((c) => indexedText(parsed.doc.title, c)) });
  }
  const totalChunks = articles.reduce((n, a) => n + a.chunks.length, 0);
  console.log(`${articles.length} articles usable (${rejected} skipped: license or no text), ${totalChunks} passages.`);

  const embedder = activeEmbedder();
  if (!embedder) throw new Error("No embedding provider: set VOYAGE_API_KEY or OPENAI_API_KEY in .env.local.");
  console.log(`Embedding with ${embedder.model}.`);
  const cache = openEmbedCache();
  const vectors = await embedAll(cache, embedder, articles.flatMap((a) => a.indexed));
  cache.close();

  const tmp = `${OUT}.tmp`;
  fs.rmSync(tmp, { force: true });
  const db = new Database(tmp);
  sqliteVec.load(db);
  createLibrarySchema(db);
  let offset = 0;
  for (const a of articles) {
    insertLibraryDocument(db, a.doc, a.chunks, a.indexed, vectors.slice(offset, offset + a.chunks.length));
    offset += a.chunks.length;
  }
  const meta = db.prepare("INSERT INTO meta (key, value) VALUES (?, ?)");
  meta.run("embed_model", embedder.model);
  meta.run("embed_dims", String(EMBED_DIMS));
  meta.run("built_at", new Date().toISOString());
  meta.run("documents", String(articles.length));
  db.exec("VACUUM");
  db.close();
  fs.renameSync(tmp, OUT);

  const mb = (fs.statSync(OUT).size / 1e6).toFixed(1);
  console.log(`Wrote ${OUT} (${articles.length} articles, ${totalChunks} passages, ${mb} MB).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
