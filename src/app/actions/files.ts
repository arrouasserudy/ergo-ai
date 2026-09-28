"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { childFiles, children } from "@/db/schema";
import { fileTypeOf, getChildFile, MAX_FILE_BYTES, removeFileBytes, writeFileBytes } from "@/lib/files";
import { requireTherapist } from "@/lib/session";
import { childFileSchema, toFieldErrors } from "@/lib/validation";
import type { FormState } from "./children";

/** Files a form (assessment, questionnaire…) in a child's record. */
export async function uploadChildFile(childId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const { accountId, therapist } = await requireTherapist();
  const child = db
    .select({ id: children.id })
    .from(children)
    .where(and(eq(children.id, childId), eq(children.accountId, accountId)))
    .get();
  if (!child) return { ok: false, errors: { form: "generic" } };

  const file = formData.get("file");
  const input = { kind: String(formData.get("kind") ?? ""), title: String(formData.get("title") ?? ""), formDate: String(formData.get("formDate") ?? "") };
  const parsed = childFileSchema.safeParse(input);
  if (!parsed.success) return { ok: false, errors: toFieldErrors(parsed.error), values: input };
  if (!(file instanceof File) || file.size === 0) return { ok: false, errors: { file: "anyFileRequired" }, values: input };
  const mimeType = fileTypeOf(file.name);
  if (!mimeType) return { ok: false, errors: { file: "formFileType" }, values: input };
  if (file.size > MAX_FILE_BYTES) return { ok: false, errors: { file: "fileSize" }, values: input };

  const filename = file.name.slice(-200);
  const title = parsed.data.title ?? filename.replace(/\.[^.]+$/, "");
  const id = crypto.randomUUID();
  await writeFileBytes(accountId, id, new Uint8Array(await file.arrayBuffer()));
  try {
    db.insert(childFiles)
      .values({ id, accountId, childId, uploadedBy: therapist.id, kind: parsed.data.kind, title, filename, mimeType, sizeBytes: file.size, formDate: parsed.data.formDate })
      .run();
  } catch (err) {
    await removeFileBytes(accountId, id);
    throw err;
  }

  revalidatePath("/", "layout"); // an assessment can complete a milestone
  return { ok: true, savedAt: Date.now(), addedName: title };
}

export async function deleteChildFile(fileId: string) {
  const { accountId } = await requireTherapist();
  const file = getChildFile(accountId, fileId);
  if (!file) return;
  db.delete(childFiles).where(eq(childFiles.id, file.id)).run();
  await removeFileBytes(accountId, file.id);
  revalidatePath("/", "layout");
}
