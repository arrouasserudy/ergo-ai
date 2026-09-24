import Database from "better-sqlite3";
import * as sqliteVec from "sqlite-vec";
import { describe, expect, it } from "vitest";
import { chunkParagraphs, indexedText } from "./chunking";
import { createLibrarySchema, insertLibraryDocument } from "./library-schema";
import { searchLibrary, searchLiterature } from "./retrieval";
import { EMBED_DIMS, type Embedder } from "./embed-types";

/** Deterministic fake embedder: one dimension per known topic word. */
const TOPICS = ["weighted", "handwriting", "feeding", "sensory"];
const fakeEmbed: Embedder = async (texts) =>
  texts.map((t) => {
    const v = new Int8Array(EMBED_DIMS);
    TOPICS.forEach((word, i) => {
      if (t.toLowerCase().includes(word)) v[i] = 100;
    });
    return v;
  });

const fake = { model: "fake", embed: fakeEmbed };

async function buildLibrary() {
  const db = new Database(":memory:");
  sqliteVec.load(db);
  createLibrarySchema(db);
  const docs = [
    { title: "Weighted vests in autism", text: "Weighted vests showed mixed effects on attention in class." },
    { title: "Handwriting interventions", text: "Handwriting speed improved after a fine motor programme." },
    { title: "Feeding difficulties", text: "Oral sensory sensitivity is frequent in feeding difficulties." },
  ];
  for (const [i, d] of docs.entries()) {
    const chunks = chunkParagraphs([{ section: "Discussion", text: d.text }]);
    const indexed = chunks.map((c) => indexedText(d.title, c));
    insertLibraryDocument(
      db,
      { sourceId: `PMC${i}`, title: d.title, authors: "Doe J", year: 2024, doi: null, url: `https://example.org/${i}`, license: "CC BY" },
      chunks,
      indexed,
      await fakeEmbed(indexed, "document"),
    );
  }
  return db;
}

describe("searchLibrary", () => {
  it("returns the matching passages first, with their source metadata", async () => {
    const db = await buildLibrary();
    const results = await searchLibrary(db, "weighted vest attention", { embedder: fake, limit: 2 });
    expect(results[0]).toMatchObject({ title: "Weighted vests in autism", license: "CC BY", section: "Discussion", year: 2024 });
    expect(results[0].id).toMatch(/^library:\d+$/);
  });

  it("finds by keywords even when vectors don't match", async () => {
    const db = await buildLibrary();
    const results = await searchLibrary(db, "oral sensitivity", { embedder: fake, limit: 1 });
    expect(results[0].title).toBe("Feeding difficulties");
  });

  it("returns nothing without a library", async () => {
    expect(await searchLibrary(null, "anything", { embedder: fake })).toEqual([]);
  });
});

/** Minimal upload tables, as created by the migrations. */
async function buildUploads() {
  const db = new Database(":memory:");
  sqliteVec.load(db);
  db.exec(`
    CREATE TABLE documents (id TEXT PRIMARY KEY, account_id TEXT, title TEXT, embed_model TEXT);
    CREATE TABLE document_chunks (id INTEGER PRIMARY KEY, document_id TEXT, account_id TEXT, page INTEGER, ordinal INTEGER, text TEXT);
    CREATE VIRTUAL TABLE document_chunks_fts USING fts5(text, tokenize = 'porter unicode61');
    CREATE VIRTUAL TABLE document_chunks_vec USING vec0(account_id text partition key, embedding int8[${EMBED_DIMS}]);
  `);
  const add = async (chunkId: number, account: string, title: string, text: string) => {
    db.prepare("INSERT OR IGNORE INTO documents VALUES (?, ?, ?, 'fake')").run(`doc-${account}`, account, title);
    db.prepare("INSERT INTO document_chunks VALUES (?, ?, ?, 4, 0, ?)").run(chunkId, `doc-${account}`, account, text);
    db.prepare("INSERT INTO document_chunks_fts (rowid, text) VALUES (?, ?)").run(chunkId, text);
    const [v] = await fakeEmbed([text], "document");
    db.prepare("INSERT INTO document_chunks_vec (rowid, account_id, embedding) VALUES (?, ?, vec_int8(?))").run(BigInt(chunkId), account, Buffer.from(v.buffer));
  };
  await add(1, "acc-a", "Cours de Michaela", "Weighted blanket protocol used in our cabinet.");
  await add(2, "acc-b", "Autre cabinet", "Weighted lap pads for another cabinet.");
  return db;
}

describe("searchLiterature (library + cabinet uploads)", () => {
  it("merges both sources and only includes the cabinet's own uploads", async () => {
    const results = await searchLiterature(
      { library: await buildLibrary(), uploads: await buildUploads(), accountId: "acc-a" },
      "weighted",
      { embedder: fake, limit: 8 },
    );
    const titles = results.map((r) => r.title);
    expect(titles).toContain("Weighted vests in autism");
    expect(titles).toContain("Cours de Michaela");
    expect(titles).not.toContain("Autre cabinet");
    const upload = results.find((r) => r.title === "Cours de Michaela")!;
    expect(upload).toMatchObject({ license: "cabinet", section: "p. 4", url: "/expert/library?doc=doc-acc-a&page=4" });
  });

  it("works before any shared library is pushed", async () => {
    const results = await searchLiterature({ library: null, uploads: await buildUploads(), accountId: "acc-b" }, "weighted", { embedder: fake });
    expect(results.map((r) => r.title)).toEqual(["Autre cabinet"]);
  });
});

describe("embedding model safety", () => {
  it("skips a library built with a different embedding model", async () => {
    const db = await buildLibrary();
    db.prepare("INSERT INTO meta (key, value) VALUES ('embed_model', 'voyage-4')").run();
    expect(await searchLibrary(db, "weighted vest", { embedder: fake })).toEqual([]);
    expect((await searchLibrary(db, "weighted vest", { embedder: { ...fake, model: "voyage-4" } })).length).toBeGreaterThan(0);
  });

  it("ignores upload vectors from another model (keyword search still finds them)", async () => {
    const uploads = await buildUploads();
    uploads.prepare("UPDATE documents SET embed_model = 'old-model'").run();
    const results = await searchLiterature({ library: null, uploads, accountId: "acc-a" }, "blanket", { embedder: fake });
    expect(results.map((r) => r.title)).toEqual(["Cours de Michaela"]); // via FTS only
  });
});
