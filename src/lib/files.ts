import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { childFiles } from "@/db/schema";

/**
 * Forms filed in a child's record (assessments, questionnaires, consents). The bytes
 * are stored next to the database, on the same volume: `<FILES_DIR>/<accountId>/<fileId>`.
 * The type served back comes from this whitelist, never from the browser.
 */
const FILES_DIR =
  process.env.FILES_DIR ?? path.join(path.dirname(process.env.DATABASE_PATH ?? path.join(process.cwd(), "data", "ergoai.db")), "files");

export const MAX_FILE_BYTES = 20 * 1024 * 1024;

const TYPES: Record<string, string> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  heic: "image/heic",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

export const ACCEPTED_FILE_TYPES = Object.keys(TYPES)
  .map((ext) => `.${ext}`)
  .join(",");

/** The MIME type for an accepted file name, or null. */
export function fileTypeOf(filename: string): string | null {
  const ext = filename.toLowerCase().split(".").pop() ?? "";
  return TYPES[ext] ?? null;
}

/** PDFs and images open in the browser; office documents download. */
export const opensInline = (mimeType: string) => mimeType === "application/pdf" || (mimeType.startsWith("image/") && mimeType !== "image/heic");

const filePath = (accountId: string, id: string) => path.join(FILES_DIR, accountId, id);

export async function writeFileBytes(accountId: string, id: string, bytes: Uint8Array) {
  await fs.mkdir(path.join(FILES_DIR, accountId), { recursive: true });
  await fs.writeFile(filePath(accountId, id), bytes);
}

export async function readFileBytes(accountId: string, id: string): Promise<Buffer | null> {
  return fs.readFile(filePath(accountId, id)).catch(() => null);
}

export async function removeFileBytes(accountId: string, id: string) {
  await fs.rm(filePath(accountId, id), { force: true });
}

export function listChildFiles(accountId: string, childId: string) {
  return db
    .select()
    .from(childFiles)
    .where(and(eq(childFiles.accountId, accountId), eq(childFiles.childId, childId)))
    .orderBy(desc(childFiles.createdAt))
    .all();
}

export function getChildFile(accountId: string, id: string) {
  return db.select().from(childFiles).where(and(eq(childFiles.id, id), eq(childFiles.accountId, accountId))).get() ?? null;
}
