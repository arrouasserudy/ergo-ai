/**
 * Schema of the shared literature library (`library.db`): a separate, read-only
 * SQLite file built offline (scripts/corpus/build.ts) and pushed to the server.
 * Chunk ids are the rowids of both the FTS5 and the sqlite-vec tables.
 */
import type Database from "better-sqlite3";
import { EMBED_DIMS } from "./embed-types";
import type { Chunk } from "./chunking";

export type LibraryDocument = {
  sourceId: string; // e.g. "PMC12927890"
  title: string;
  authors: string; // "Surname A, Surname B et al."
  year: number | null;
  doi: string | null;
  url: string;
  license: string; // "CC BY" | "CC0"
};

export function createLibrarySchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS documents (
      id INTEGER PRIMARY KEY, source_id TEXT NOT NULL UNIQUE, title TEXT NOT NULL, authors TEXT NOT NULL,
      year INTEGER, doi TEXT, url TEXT NOT NULL, license TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS chunks (
      id INTEGER PRIMARY KEY, document_id INTEGER NOT NULL REFERENCES documents(id),
      section TEXT NOT NULL, ordinal INTEGER NOT NULL, text TEXT NOT NULL
    );
    CREATE VIRTUAL TABLE IF NOT EXISTS chunks_fts USING fts5(text, tokenize = 'porter unicode61');
    CREATE VIRTUAL TABLE IF NOT EXISTS chunks_vec USING vec0(embedding int8[${EMBED_DIMS}]);
  `);
}

/** Inserts one document with its chunks; `indexed[i]` and `embeddings[i]` belong to `chunks[i]`. */
export function insertLibraryDocument(
  db: Database.Database,
  doc: LibraryDocument,
  chunks: Chunk[],
  indexed: string[],
  embeddings: Int8Array[],
) {
  const insertDoc = db.prepare(
    "INSERT INTO documents (source_id, title, authors, year, doi, url, license) VALUES (?, ?, ?, ?, ?, ?, ?)",
  );
  const insertChunk = db.prepare("INSERT INTO chunks (document_id, section, ordinal, text) VALUES (?, ?, ?, ?)");
  const insertFts = db.prepare("INSERT INTO chunks_fts (rowid, text) VALUES (?, ?)");
  const insertVec = db.prepare("INSERT INTO chunks_vec (rowid, embedding) VALUES (?, vec_int8(?))");

  db.transaction(() => {
    const docId = insertDoc.run(doc.sourceId, doc.title, doc.authors, doc.year, doc.doi, doc.url, doc.license).lastInsertRowid;
    chunks.forEach((chunk, i) => {
      const chunkId = BigInt(insertChunk.run(docId, chunk.section, chunk.ordinal, chunk.text).lastInsertRowid);
      insertFts.run(chunkId, indexed[i]);
      insertVec.run(chunkId, Buffer.from(embeddings[i].buffer, embeddings[i].byteOffset, embeddings[i].byteLength));
    });
  })();
}
