"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import {
  REPORT_DOC_TYPES,
  REPORT_RECIPIENTS,
  reports,
  reportVariants,
  styleExamples,
  type ReportDocType,
  type ReportRecipient,
  type ReportSection,
  type ReportVariant,
} from "@/db/schema";
import { getLocale } from "@/i18n/server";
import { getChild } from "@/lib/children";
import { defaultProvider } from "@/lib/expert/providers";
import { DAILY_GENERATION_LIMIT, GenerationError, generateSections } from "@/lib/reports/generate";
import { fillChildPlaceholder, reportSystemPrompt, reportUserPrompt } from "@/lib/reports/prompt";
import { generationsToday, getReport, listVariants, recentStyleExamples } from "@/lib/reports/queries";
import { deriveReportStatus, wasEdited } from "@/lib/reports/status";
import { requireTherapist } from "@/lib/session";
import { APP_TIME_ZONE } from "@/lib/time";
import { reportSchema, reportSectionsSchema, toFieldErrors, type FieldErrors, type ReportInput } from "@/lib/validation";

// Each action re-checks the session and scopes by account (actions are reachable by direct POST).

const isRecipient = (value: unknown): value is ReportRecipient => (REPORT_RECIPIENTS as readonly unknown[]).includes(value);

function revalidateReport(id: string, childId: string) {
  revalidatePath("/reports");
  revalidatePath(`/reports/${id}`);
  revalidatePath(`/children/${childId}`);
}

/** Recomputes the stored status from the variants (the update also bumps `updatedAt`). */
function refreshStatus(reportId: string) {
  const report = db.select({ recipients: reports.recipients }).from(reports).where(eq(reports.id, reportId)).get();
  if (!report) return;
  const status = deriveReportStatus(report.recipients, listVariants(reportId));
  db.update(reports).set({ status }).where(eq(reports.id, reportId)).run();
}

/** Today's date in the practice's time zone (YYYY-MM-DD). */
const today = () => new Date().toLocaleDateString("en-CA", { timeZone: APP_TIME_ZONE });

/** Form action of the "new report" page: child + document type. */
export async function createReport(formData: FormData) {
  const { accountId, therapist } = await requireTherapist();
  const childId = String(formData.get("childId") ?? "");
  const docType = String(formData.get("docType") ?? "") as ReportDocType;
  if (!REPORT_DOC_TYPES.includes(docType)) throw new Error("Invalid document type");
  const child = getChild(accountId, childId);
  if (!child) redirect("/reports/new");

  const { id } = db
    .insert(reports)
    .values({ accountId, childId, authorId: therapist.id, docType, sessionDate: today(), language: await getLocale() })
    .returning({ id: reports.id })
    .get();
  revalidateReport(id, childId);
  redirect(`/reports/${id}`);
}

export type SaveReportResult = { ok: boolean; errors?: FieldErrors };

/** Autosave of the left-hand side: notes, tests, date, type, recipients, language. */
export async function saveReport(id: string, data: ReportInput): Promise<SaveReportResult> {
  const { accountId } = await requireTherapist();
  const parsed = reportSchema.safeParse(data);
  if (!parsed.success) return { ok: false, errors: toFieldErrors(parsed.error) };

  const updated = db
    .update(reports)
    .set(parsed.data)
    .where(and(eq(reports.id, id), eq(reports.accountId, accountId)))
    .returning({ childId: reports.childId })
    .get();
  if (!updated) return { ok: false, errors: { form: "generic" } };
  refreshStatus(id);
  revalidateReport(id, updated.childId);
  return { ok: true };
}

type ReportRow = NonNullable<ReturnType<typeof getReport>>;
type ChildRow = NonNullable<ReturnType<typeof getChild>>;

/** The exact prompts sent to the model, one per recipient. Shared by generation and its preview. */
function buildPrompts(report: ReportRow, child: ChildRow, therapistId: string, targets: ReportRecipient[]) {
  const examples = recentStyleExamples(therapistId, targets);
  const system = reportSystemPrompt(report.language);
  const prompts = targets.map((recipient) => ({
    recipient,
    prompt: reportUserPrompt({
      child,
      docType: report.docType,
      recipient,
      sessionDate: report.sessionDate,
      notes: report.notes,
      tests: report.tests,
      examples: examples[recipient],
    }),
  }));
  return { system, prompts };
}

export type PromptPreview = { system: string; prompt: string };

/** What the AI would receive for this recipient, from the saved report (shown before generating). */
export async function previewReportPrompt(id: string, recipient: ReportRecipient): Promise<PromptPreview | null> {
  const { accountId, therapist } = await requireTherapist();
  const report = getReport(accountId, id);
  const child = report && getChild(accountId, report.childId);
  if (!report || !child || !isRecipient(recipient)) return null;
  const { system, prompts } = buildPrompts(report, child, therapist.id, [recipient]);
  return { system, prompt: prompts[0].prompt };
}

export type GenerateResult = { ok: true; variants: ReportVariant[] } | { ok: false; error: string };

/**
 * Drafts one version per recipient, in parallel, from the saved notes. Overwrites
 * any previous version of those recipients (the client confirms first when edited).
 */
export async function generateReport(id: string, recipients: ReportRecipient[]): Promise<GenerateResult> {
  const { accountId, therapist } = await requireTherapist();
  const report = getReport(accountId, id);
  const child = report && getChild(accountId, report.childId);
  if (!report || !child) return { ok: false, error: "generic" };
  const targets = REPORT_RECIPIENTS.filter((r) => recipients.includes(r));
  if (targets.length === 0) return { ok: false, error: "generic" };
  if (!report.notes.trim()) return { ok: false, error: "notesRequired" };

  const provider = defaultProvider();
  if (!provider) return { ok: false, error: "unavailable" };
  if (generationsToday(accountId) + targets.length > DAILY_GENERATION_LIMIT) return { ok: false, error: "limit" };

  const { system, prompts } = buildPrompts(report, child, therapist.id, targets);
  const results = await Promise.allSettled(
    prompts.map(async ({ recipient, prompt }) => ({ recipient, ...(await generateSections(provider, system, prompt)) })),
  );

  const now = new Date();
  db.transaction((tx) => {
    for (const result of results) {
      if (result.status !== "fulfilled") continue;
      const { recipient, sections: raw, model, usage } = result.value;
      const sections = fillChildPlaceholder(raw, child.name);
      const values = { generated: sections, sections, model, inputTokens: usage.input, outputTokens: usage.output, generatedAt: now, validatedAt: null, exportedAt: null };
      tx.insert(reportVariants)
        .values({ reportId: id, accountId, recipient, ...values })
        .onConflictDoUpdate({ target: [reportVariants.reportId, reportVariants.recipient], set: values })
        .run();
    }
  });
  refreshStatus(id);
  revalidateReport(id, report.childId);

  const failure = results.find((r) => r.status === "rejected");
  if (failure) {
    const reason = (failure as PromiseRejectedResult).reason;
    if (!(reason instanceof GenerationError)) console.error("Report generation failed", reason);
    return { ok: false, error: reason instanceof GenerationError ? reason.code : "generic" };
  }
  return { ok: true, variants: listVariants(id) };
}

/** Loads a variant of a report of this account. */
function findVariant(accountId: string, reportId: string, recipient: ReportRecipient) {
  if (!isRecipient(recipient)) return null;
  const report = getReport(accountId, reportId);
  if (!report) return null;
  const variant = db
    .select()
    .from(reportVariants)
    .where(and(eq(reportVariants.reportId, reportId), eq(reportVariants.recipient, recipient)))
    .get();
  return variant ? { report, variant } : null;
}

export type VariantResult = { ok: boolean; error?: string; variant?: ReportVariant };

/** Autosave of an edited version. Any edit takes it back to draft: it must be validated again. */
export async function saveVariant(reportId: string, recipient: ReportRecipient, sections: ReportSection[]): Promise<VariantResult> {
  const { accountId } = await requireTherapist();
  const parsed = reportSectionsSchema.safeParse(sections);
  const found = findVariant(accountId, reportId, recipient);
  if (!parsed.success || !found) return { ok: false, error: "generic" };

  const variant = db
    .update(reportVariants)
    .set({ sections: parsed.data, validatedAt: null, exportedAt: null })
    .where(eq(reportVariants.id, found.variant.id))
    .returning()
    .get();
  refreshStatus(reportId);
  revalidateReport(reportId, found.report.childId);
  return { ok: true, variant };
}

/**
 * Validates a version as shown (saving it first, so a pending autosave can't be lost).
 * When the therapist changed the draft, the pair is kept as a style example.
 */
export async function validateVariant(reportId: string, recipient: ReportRecipient, sections: ReportSection[]): Promise<VariantResult> {
  const { accountId, therapist } = await requireTherapist();
  const parsed = reportSectionsSchema.safeParse(sections);
  const found = findVariant(accountId, reportId, recipient);
  if (!parsed.success || !found) return { ok: false, error: "generic" };
  const { report } = found;

  const variant = db.transaction((tx) => {
    const updated = tx
      .update(reportVariants)
      .set({ sections: parsed.data, validatedAt: new Date() })
      .where(eq(reportVariants.id, found.variant.id))
      .returning()
      .get();
    if (wasEdited(updated.generated, updated.sections)) {
      const example = { therapistId: therapist.id, recipient, docType: report.docType, before: updated.generated, after: updated.sections, createdAt: new Date() };
      tx.insert(styleExamples)
        .values({ accountId, variantId: updated.id, ...example })
        .onConflictDoUpdate({ target: styleExamples.variantId, set: example })
        .run();
    } else {
      tx.delete(styleExamples).where(eq(styleExamples.variantId, updated.id)).run();
    }
    return updated;
  });
  refreshStatus(reportId);
  revalidateReport(reportId, report.childId);
  return { ok: true, variant };
}

/** Called by the browser after a PDF/Word export or a copy. Only validated versions can be exported. */
export async function markExported(reportId: string, recipient: ReportRecipient): Promise<VariantResult> {
  const { accountId } = await requireTherapist();
  const found = findVariant(accountId, reportId, recipient);
  if (!found || !found.variant.validatedAt) return { ok: false, error: "generic" };

  const variant = db.update(reportVariants).set({ exportedAt: new Date() }).where(eq(reportVariants.id, found.variant.id)).returning().get();
  refreshStatus(reportId);
  revalidateReport(reportId, found.report.childId);
  return { ok: true, variant };
}

export async function deleteReport(id: string) {
  const { accountId } = await requireTherapist();
  const deleted = db
    .delete(reports)
    .where(and(eq(reports.id, id), eq(reports.accountId, accountId)))
    .returning({ childId: reports.childId })
    .get();
  if (deleted) revalidateReport(id, deleted.childId);
  redirect("/reports");
}
