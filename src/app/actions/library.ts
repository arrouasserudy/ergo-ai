"use server";

import { and, desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { documents } from "@/db/schema";
import { deleteUpload, indexUpload, MAX_UPLOAD_BYTES, pdfParagraphs } from "@/lib/expert/uploads";
import { activeEmbedder } from "@/lib/expert/embeddings";
import { requireTherapist } from "@/lib/session";
import type { FormState } from "./children";

export async function listDocuments() {
  const { accountId } = await requireTherapist();
  return db.select().from(documents).where(eq(documents.accountId, accountId)).orderBy(desc(documents.createdAt)).all();
}

/** Uploads a PDF to the cabinet's library and indexes it (synchronously: a few seconds per document). */
export async function uploadDocument(_prev: FormState, formData: FormData): Promise<FormState> {
  const { accountId, therapist } = await requireTherapist();
  const file = formData.get("file");
  const entitled = formData.get("entitled") === "on";
  const values = { title: String(formData.get("title") ?? "") };

  if (!(file instanceof File) || file.size === 0) return { ok: false, errors: { file: "fileRequired" }, values };
  if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) return { ok: false, errors: { file: "fileType" }, values };
  if (file.size > MAX_UPLOAD_BYTES) return { ok: false, errors: { file: "fileSize" }, values };
  if (!entitled) return { ok: false, errors: { entitled: "entitled" }, values };
  const embedder = activeEmbedder();
  if (!embedder) return { ok: false, errors: { form: "indexUnavailable" }, values };

  const title = values.title.trim().slice(0, 200) || file.name.replace(/\.pdf$/i, "");
  const doc = db
    .insert(documents)
    .values({ accountId, uploadedBy: therapist.id, title, filename: file.name.slice(0, 200), embedModel: embedder.model })
    .returning()
    .get();

  try {
    const { pages, paragraphs } = await pdfParagraphs(new Uint8Array(await file.arrayBuffer()));
    await indexUpload(doc, paragraphs, embedder);
    db.update(documents).set({ status: "ready", pages }).where(eq(documents.id, doc.id)).run();
  } catch (err) {
    const noText = err instanceof Error && err.message === "noText";
    if (!noText) console.error("[library] indexing failed", err);
    deleteUpload(doc.id);
    revalidatePath("/expert/library");
    return { ok: false, errors: { form: noText ? "noText" : "generic" }, values };
  }

  revalidatePath("/expert/library");
  return { ok: true, savedAt: Date.now(), addedName: title };
}

export async function deleteDocument(documentId: string) {
  const { accountId } = await requireTherapist();
  const doc = db
    .select({ id: documents.id })
    .from(documents)
    .where(and(eq(documents.id, documentId), eq(documents.accountId, accountId)))
    .get();
  if (!doc) return;
  deleteUpload(doc.id);
  revalidatePath("/expert/library");
}
