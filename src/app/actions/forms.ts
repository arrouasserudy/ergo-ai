"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { FORM_TEMPLATE_STATUSES, formTemplates, type FormTemplateStatus } from "@/db/schema";
import { getLocale } from "@/i18n/server";
import { defaultProvider } from "@/lib/expert/providers";
import { MAX_UPLOAD_BYTES } from "@/lib/expert/uploads";
import { convertForm, DAILY_CONVERSION_LIMIT, sourceKind } from "@/lib/forms/convert";
import { conversionsToday, getTemplate } from "@/lib/forms/queries";
import { formSchema, type FormSchema } from "@/lib/forms/schema";
import { GenerationError } from "@/lib/reports/generate";
import { requireTherapist } from "@/lib/session";
import type { FormState } from "./children";

// Each action re-checks the session and scopes by account (actions are reachable by direct POST).

function revalidateTemplate(id?: string) {
  revalidatePath("/forms");
  if (id) revalidatePath(`/forms/${id}`);
}

/** Converts an uploaded blank questionnaire (PDF or Word) into a draft form, then opens it. */
export async function uploadFormTemplate(_prev: FormState, formData: FormData): Promise<FormState> {
  const { accountId, therapist } = await requireTherapist();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { ok: false, errors: { file: "fileRequired" } };
  const kind = sourceKind(file);
  if (!kind) return { ok: false, errors: { file: "fileType" } };
  if (file.size > MAX_UPLOAD_BYTES) return { ok: false, errors: { file: "fileSize" } };
  if (formData.get("blank") !== "on") return { ok: false, errors: { blank: "blank" } };

  const provider = defaultProvider();
  if (!provider) return { ok: false, errors: { form: "unavailable" } };
  if (conversionsToday(accountId) >= DAILY_CONVERSION_LIMIT) return { ok: false, errors: { form: "limit" } };

  const filename = file.name.slice(0, 200);
  let id: string;
  try {
    const { schema, model, usage } = await convertForm(provider, { bytes: new Uint8Array(await file.arrayBuffer()), filename, kind }, await getLocale());
    id = db
      .insert(formTemplates)
      .values({
        accountId,
        createdBy: therapist.id,
        title: schema.title,
        sourceFilename: filename,
        sourceKind: kind,
        schema,
        model,
        inputTokens: usage.input,
        outputTokens: usage.output,
        generatedAt: new Date(),
      })
      .returning({ id: formTemplates.id })
      .get().id;
  } catch (err) {
    if (err instanceof GenerationError) return { ok: false, errors: { form: err.code } };
    if (err instanceof Error && (err.message === "noText" || err.message === "noFields")) return { ok: false, errors: { form: err.message } };
    console.error("[forms] conversion failed", err);
    return { ok: false, errors: { form: "generic" } };
  }
  revalidateTemplate();
  redirect(`/forms/${id}`);
}

export type SaveTemplateResult = { ok: true; savedAt: number } | { ok: false; error: string; issues?: string[] };

/** Saves the edited form. Issues are the paths ("sections.0.fields.2.label") of invalid values. */
export async function saveFormTemplate(id: string, schema: FormSchema): Promise<SaveTemplateResult> {
  const { accountId } = await requireTherapist();
  const parsed = formSchema.safeParse(schema);
  if (!parsed.success) return { ok: false, error: "invalid", issues: parsed.error.issues.map((i) => i.path.join(".")) };
  const updated = db
    .update(formTemplates)
    .set({ schema: parsed.data, title: parsed.data.title })
    .where(and(eq(formTemplates.id, id), eq(formTemplates.accountId, accountId)))
    .run();
  if (updated.changes === 0) return { ok: false, error: "generic" };
  revalidateTemplate(id);
  return { ok: true, savedAt: Date.now() };
}

/** Publish, back to draft, archive or restore. */
export async function setFormTemplateStatus(id: string, status: FormTemplateStatus) {
  const { accountId } = await requireTherapist();
  if (!FORM_TEMPLATE_STATUSES.includes(status)) return;
  const template = getTemplate(accountId, id);
  if (!template) return;
  if (status === "published" && !formSchema.safeParse(template.schema).success) return;
  db.update(formTemplates).set({ status }).where(eq(formTemplates.id, id)).run();
  revalidateTemplate(id);
}

/** Forms already attached to children keep their own copy of the schema. */
export async function deleteFormTemplate(id: string) {
  const { accountId } = await requireTherapist();
  db.delete(formTemplates).where(and(eq(formTemplates.id, id), eq(formTemplates.accountId, accountId))).run();
  revalidateTemplate();
  redirect("/forms");
}
