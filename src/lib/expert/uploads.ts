import "server-only";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { documentChunks, documents } from "@/db/schema";
import { chunkParagraphs, indexedText, type Paragraph } from "./chunking";
import type { EmbedderInfo } from "./embed-types";

export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;

const client = () => (db as unknown as { $client: import("better-sqlite3").Database }).$client;

/** Text of each page, split into paragraphs; section = "p. N" so citations point at a page. */
export async function pdfParagraphs(bytes: Uint8Array): Promise<{ pages: number; paragraphs: Paragraph[] }> {
  const { extractText, getDocumentProxy } = await import("unpdf");
  const pdf = await getDocumentProxy(bytes);
  const { totalPages, text } = await extractText(pdf, { mergePages: false });
  const paragraphs = text.flatMap((pageText, i) =>
    pageText.split(/\n\s*\n/).map((t) => ({ section: `p. ${i + 1}`, page: i + 1, text: t })),
  );
  return { pages: totalPages, paragraphs };
}

/** Chunks, embeds and indexes an uploaded document's text. Throws when there is no text. */
export async function indexUpload(
  doc: { id: string; accountId: string; title: string },
  paragraphs: Paragraph[],
  embedder: EmbedderInfo,
): Promise<number> {
  const chunks = chunkParagraphs(paragraphs);
  if (chunks.length === 0) throw new Error("noText");
  const indexed = chunks.map((c) => indexedText(doc.title, c));
  const vectors = await embedder.embed(indexed, "document");

  const sqlite = client();
  const insertFts = sqlite.prepare("INSERT INTO document_chunks_fts (rowid, text) VALUES (?, ?)");
  const insertVec = sqlite.prepare("INSERT INTO document_chunks_vec (rowid, account_id, embedding) VALUES (?, ?, vec_int8(?))");
  db.transaction((tx) => {
    chunks.forEach((chunk, i) => {
      const row = tx
        .insert(documentChunks)
        .values({ documentId: doc.id, accountId: doc.accountId, page: chunk.page ?? null, ordinal: chunk.ordinal, text: chunk.text })
        .returning({ id: documentChunks.id })
        .get();
      insertFts.run(row.id, indexed[i]);
      insertVec.run(BigInt(row.id), doc.accountId, Buffer.from(vectors[i].buffer, vectors[i].byteOffset, vectors[i].byteLength));
    });
  });
  return chunks.length;
}

/** Removes a document and its search index entries (virtual tables have no foreign keys). */
export function deleteUpload(documentId: string) {
  const ids = db.select({ id: documentChunks.id }).from(documentChunks).where(eq(documentChunks.documentId, documentId)).all().map((r) => r.id);
  const sqlite = client();
  db.transaction((tx) => {
    if (ids.length) {
      const placeholders = ids.map(() => "?").join(",");
      sqlite.prepare(`DELETE FROM document_chunks_fts WHERE rowid IN (${placeholders})`).run(...ids);
      sqlite.prepare(`DELETE FROM document_chunks_vec WHERE rowid IN (${placeholders})`).run(...ids.map(BigInt));
      tx.delete(documentChunks).where(inArray(documentChunks.id, ids)).run();
    }
    tx.delete(documents).where(eq(documents.id, documentId)).run();
  });
}
