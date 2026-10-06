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
  type ReportInsight,
  type ReportRecipient,
  type ReportSection,
  type ReportVariant,
} from "@/db/schema";
import { getLocale } from "@/i18n/server";
import { getChild } from "@/lib/children";
import { defaultProvider } from "@/lib/expert/providers";
import { DAILY_GENERATION_LIMIT, GenerationError, generateDraft, generateRewrite } from "@/lib/reports/generate";
import { editInsights, mapInsightText, markApplied, newInsights, validatedInsights } from "@/lib/reports/insights";
import { assessmentResultsText } from "@/lib/assessments/prompt";
import { completedAssessments } from "@/lib/assessments/queries";
import { getDefinition } from "@/lib/assessments/registry";
import { formAnswersForPrompt } from "@/lib/forms/answers";
import { submittedChildForms } from "@/lib/forms/queries";
import {
  CHILD_PLACEHOLDER,
  fillChildPlaceholder,
  pseudonymizeSections,
  reportSystemPrompt,
  reportUserPrompt,
  rewriteSystemPrompt,
  rewriteUserPrompt,
} from "@/lib/reports/prompt";
import { generationsToday, getReport, listVariants, recentStyleExamples } from "@/lib/reports/queries";
import { deriveReportStatus, wasEdited } from "@/lib/reports/status";
import { requireTherapist } from "@/lib/session";
import { localToday } from "@/lib/time";
import { replaceChildName } from "@/lib/reports/text";
import { insightEditsSchema, reportSchema, reportSectionsSchema, toFieldErrors, type FieldErrors, type ReportInput } from "@/lib/validation";
import { track } from "@/lib/analytics/track";

// Each action re-checks the session and scopes by account (actions are reachable by direct POST).

const isRecipient = (value: unknown): value is ReportRecipient => (REPORT_RECIPIENTS as readonly unknown[]).includes(value);

function revalidateReport(id: string, childId: string) {
  revalidatePath(`/reports/${id}`);
  revalidatePath(`/children/${childId}`, "layout");
}

/** Recomputes the stored status from the variants (the update also bumps `updatedAt`). */
function refreshStatus(reportId: string) {
  const report = db.select({ recipients: reports.recipients }).from(reports).where(eq(reports.id, reportId)).get();
  if (!report) return;
  const status = deriveReportStatus(report.recipients, listVariants(reportId));
  db.update(reports).set({ status }).where(eq(reports.id, reportId)).run();
}


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
    .values({ accountId, childId, authorId: therapist.id, docType, sessionDate: localToday(), language: await getLocale() })
    .returning({ id: reports.id })
    .get();
  track({ accountId, therapist }, "report.created", { docType });
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
  const system = reportSystemPrompt(report.language, report.docType);
  // Identifying answers stay out; the child's name typed in other answers becomes the placeholder.
  const forms = submittedChildForms(report.accountId, child.id, report.formIds).map((form) => ({
    title: form.schema.title,
    text: formAnswersForPrompt(form.schema, form.answers, child.name, CHILD_PLACEHOLDER),
  }));
  // Computed scores only: never the answers or comments of a test.
  const assessments = completedAssessments(report.accountId, child.id, report.assessmentIds).flatMap((test) => {
    const definition = getDefinition(test.definitionId);
    return definition && test.scores ? [{ name: definition.name, date: test.testDate, text: assessmentResultsText(test.scores) }] : [];
  });
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
      forms,
      assessments,
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

const newInsightId = () => crypto.randomUUID().slice(0, 8);

/**
 * Drafts one version per recipient, in parallel, from the saved notes, with the
 * model's clinical ideas apart. Overwrites any previous version of those recipients
 * (the client confirms first when edited).
 */
export async function generateReport(id: string, recipients: ReportRecipient[]): Promise<GenerateResult> {
  const { accountId, therapist } = await requireTherapist();
  const report = getReport(accountId, id);
  const child = report && getChild(accountId, report.childId);
  if (!report || !child) return { ok: false, error: "generic" };
  const targets = REPORT_RECIPIENTS.filter((r) => recipients.includes(r));
  if (targets.length === 0) return { ok: false, error: "generic" };
  if (!report.notes.trim() && report.formIds.length === 0 && report.assessmentIds.length === 0) return { ok: false, error: "notesRequired" };

  const provider = defaultProvider();
  if (!provider) return { ok: false, error: "unavailable" };
  if (generationsToday(accountId) + targets.length > DAILY_GENERATION_LIMIT) return { ok: false, error: "limit" };

  const { system, prompts } = buildPrompts(report, child, therapist.id, targets);
  const results = await Promise.allSettled(
    prompts.map(async ({ recipient, prompt }) => ({ recipient, ...(await generateDraft(provider, system, prompt)) })),
  );

  const now = new Date();
  db.transaction((tx) => {
    for (const result of results) {
      if (result.status !== "fulfilled") continue;
      const { recipient, sections: raw, insights: rawInsights, model, usage } = result.value;
      const sections = fillChildPlaceholder(raw, child.name);
      const insights = mapInsightText(newInsights(rawInsights, newInsightId), (text) => text.split(CHILD_PLACEHOLDER).join(child.name).trim());
      const values = { generated: sections, sections, insights, model, inputTokens: usage.input, outputTokens: usage.output, generatedAt: now, validatedAt: null, exportedAt: null };
      tx.insert(reportVariants)
        .values({ reportId: id, accountId, recipient, ...values })
        .onConflictDoUpdate({ target: [reportVariants.reportId, reportVariants.recipient], set: values })
        .run();
    }
  });
  refreshStatus(id);
  revalidateReport(id, report.childId);
  for (const result of results) {
    if (result.status === "fulfilled") track({ accountId, therapist }, "report.generated", { recipient: result.value.recipient, provider, forms: report.formIds.length, tests: report.assessmentIds.length });
  }

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

/** Autosave of the ideas: edited text, validated or dismissed. The report text is unchanged. */
export async function saveInsights(reportId: string, recipient: ReportRecipient, edits: Pick<ReportInsight, "id" | "text" | "status">[]): Promise<VariantResult> {
  const { accountId, therapist } = await requireTherapist();
  const parsed = insightEditsSchema.safeParse(edits);
  const found = findVariant(accountId, reportId, recipient);
  if (!parsed.success || !found) return { ok: false, error: "generic" };

  const variant = db
    .update(reportVariants)
    .set({ insights: editInsights(found.variant.insights, parsed.data) })
    .where(eq(reportVariants.id, found.variant.id))
    .returning()
    .get();
  // Autosave runs on every change: only a decision on an idea counts as a use.
  const before = new Map(found.variant.insights.map((i) => [i.id, i.status]));
  for (const insight of variant.insights) {
    if (insight.status === before.get(insight.id)) continue;
    if (insight.status === "validated") track({ accountId, therapist }, "report.insight_validated", { kind: insight.kind });
    if (insight.status === "dismissed") track({ accountId, therapist }, "report.insight_dismissed", { kind: insight.kind });
  }
  revalidateReport(reportId, found.report.childId);
  return { ok: true, variant };
}

/**
 * Rewrites the current text (as edited) with the validated ideas, which become
 * `applied`. The result is a new draft: `generated` too, so the therapist's later
 * corrections still teach her style, and it must be validated again.
 */
export async function rewriteWithInsights(reportId: string, recipient: ReportRecipient): Promise<VariantResult> {
  const { accountId, therapist } = await requireTherapist();
  const found = findVariant(accountId, reportId, recipient);
  const child = found && getChild(accountId, found.report.childId);
  if (!found || !child) return { ok: false, error: "generic" };
  const { report, variant } = found;
  const ideas = validatedInsights(variant.insights);
  if (ideas.length === 0) return { ok: false, error: "noValidatedInsights" };

  const provider = defaultProvider();
  if (!provider) return { ok: false, error: "unavailable" };
  if (generationsToday(accountId) + 1 > DAILY_GENERATION_LIMIT) return { ok: false, error: "limit" };

  // The name never leaves the server: the therapist's text and ideas go back to the placeholder.
  const pseudonymize = (text: string) => replaceChildName(text, child.name, CHILD_PLACEHOLDER);
  const prompt = rewriteUserPrompt({
    docType: report.docType,
    recipient,
    sections: pseudonymizeSections(variant.sections, child.name),
    insights: mapInsightText(ideas, pseudonymize),
  });
  let result;
  try {
    result = await generateRewrite(provider, rewriteSystemPrompt(report.language, report.docType), prompt);
  } catch (err) {
    if (!(err instanceof GenerationError)) console.error("Report rewrite failed", err);
    return { ok: false, error: err instanceof GenerationError ? err.code : "generic" };
  }

  const sections = fillChildPlaceholder(result.sections, child.name);
  const updated = db
    .update(reportVariants)
    .set({
      generated: sections,
      sections,
      insights: markApplied(variant.insights, ideas.map((i) => i.id)),
      model: result.model,
      inputTokens: result.usage.input,
      outputTokens: result.usage.output,
      generatedAt: new Date(),
      validatedAt: null,
      exportedAt: null,
    })
    .where(eq(reportVariants.id, variant.id))
    .returning()
    .get();
  track({ accountId, therapist }, "report.rewritten", { ideas: ideas.length });
  refreshStatus(reportId);
  revalidateReport(reportId, report.childId);
  return { ok: true, variant: updated };
}

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
  track({ accountId, therapist }, "report.validated", { recipient, edited: wasEdited(variant.generated, variant.sections) });
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
  redirect(deleted ? `/children/${deleted.childId}/reports` : "/children");
}
