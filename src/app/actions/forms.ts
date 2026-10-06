"use server";

import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { FORM_TEMPLATE_STATUSES, formTemplates, type FormTemplateStatus } from "@/db/schema";
import { getLocale } from "@/i18n/server";
import { defaultProvider } from "@/lib/expert/providers";
import { MAX_UPLOAD_BYTES } from "@/lib/expert/uploads";
import { syncAutoForms } from "@/lib/forms/auto-assign";
import { convertForm, DAILY_CONVERSION_LIMIT, sourceKind } from "@/lib/forms/convert";
import { isDayMonth } from "@/lib/forms/deadlines";
import { conversionsToday, getTemplate } from "@/lib/forms/queries";
import { formSchema, type FormSchema } from "@/lib/forms/schema";
import { GenerationError } from "@/lib/reports/generate";
import { requireTherapist } from "@/lib/session";
import type { FormState } from "./children";
import { track } from "@/lib/analytics/track";

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
  track({ accountId, therapist }, "form.uploaded", { kind });
  revalidateTemplate();
  redirect(`/forms/${id}`);
}

export type SaveTemplateResult = { ok: true; savedAt: number } | { ok: false; error: string; issues?: string[] };

/**
 * Saves the edited form. Issues are the paths ("sections.0.fields.2.label") of invalid values.
 * Built-in forms are not editable: their content comes from `lib/forms/defaults`.
 */
export async function saveFormTemplate(id: string, schema: FormSchema): Promise<SaveTemplateResult> {
  const { accountId } = await requireTherapist();
  const parsed = formSchema.safeParse(schema);
  if (!parsed.success) return { ok: false, error: "invalid", issues: parsed.error.issues.map((i) => i.path.join(".")) };
  const updated = db
    .update(formTemplates)
    .set({ schema: parsed.data, title: parsed.data.title })
    .where(and(eq(formTemplates.id, id), eq(formTemplates.accountId, accountId), isNull(formTemplates.builtinKey)))
    .run();
  if (updated.changes === 0) return { ok: false, error: "generic" };
  revalidateTemplate(id);
  return { ok: true, savedAt: Date.now() };
}

export type StatusResult = { ok: true } | { ok: false; error: string; issues?: string[] };

/** Publish, back to draft, archive or restore. Publishing an invalid form returns its issues. Built-in forms stay published. */
export async function setFormTemplateStatus(id: string, status: FormTemplateStatus): Promise<StatusResult> {
  const { accountId, therapist } = await requireTherapist();
  if (!FORM_TEMPLATE_STATUSES.includes(status)) return { ok: false, error: "generic" };
  const template = getTemplate(accountId, id);
  if (!template || template.builtinKey) return { ok: false, error: "generic" };
  if (status === "published") {
    const parsed = formSchema.safeParse(template.schema);
    if (!parsed.success) return { ok: false, error: "invalid", issues: parsed.error.issues.map((i) => i.path.join(".")) };
  }
  db.update(formTemplates).set({ status }).where(eq(formTemplates.id, id)).run();
  if (status === "published") {
    syncAutoForms(accountId);
    if (template.status !== "published") track({ accountId, therapist }, "form.published");
  }
  revalidateTemplate(id);
  revalidatePath("/", "layout");
  return { ok: true };
}

export type AutomationInput = { autoAssign: boolean; deadline: string | null };

/** Auto-assignment to every child and the yearly deadline; applies at once when published. */
export async function setFormTemplateAutomation(id: string, input: AutomationInput): Promise<{ ok: boolean }> {
  const { accountId, therapist } = await requireTherapist();
  if (typeof input?.autoAssign !== "boolean" || (input.deadline !== null && !isDayMonth(input.deadline))) return { ok: false };
  const updated = db
    .update(formTemplates)
    .set({ autoAssign: input.autoAssign, deadline: input.deadline })
    .where(and(eq(formTemplates.id, id), eq(formTemplates.accountId, accountId)))
    .run();
  if (updated.changes === 0) return { ok: false };
  track({ accountId, therapist }, "form.automated", { auto: input.autoAssign, deadline: input.deadline !== null });
  syncAutoForms(accountId);
  revalidateTemplate(id);
  revalidatePath("/", "layout");
  return { ok: true };
}

/** Forms already attached to children keep their own copy of the schema. Built-in forms cannot be deleted. */
export async function deleteFormTemplate(id: string) {
  const { accountId } = await requireTherapist();
  db.delete(formTemplates).where(and(eq(formTemplates.id, id), eq(formTemplates.accountId, accountId), isNull(formTemplates.builtinKey))).run();
  revalidateTemplate();
  redirect("/forms");
}
