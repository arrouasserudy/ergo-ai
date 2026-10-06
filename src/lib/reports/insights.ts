import { REPORT_INSIGHT_KINDS, type ReportInsight, type ReportInsightKind } from "@/db/schema";

/** At most this many ideas per version: a few strong ones, not a list to wade through. */
export const MAX_INSIGHTS = 8;
export const MAX_INSIGHT_LENGTH = 2000;

/** What the model returns for one idea, before it gets an id and a status. */
export type RawInsight = { kind: string; text: string; basis: string };

const isKind = (kind: string): kind is ReportInsightKind => (REPORT_INSIGHT_KINDS as readonly string[]).includes(kind);

/** The model's ideas, cleaned: known kinds, non-empty text, capped, all pending. */
export function newInsights(raw: RawInsight[], makeId: () => string): ReportInsight[] {
  return raw
    .map((i) => ({ kind: i.kind, text: i.text.trim().slice(0, MAX_INSIGHT_LENGTH), basis: i.basis.trim().slice(0, MAX_INSIGHT_LENGTH) }))
    .filter((i): i is { kind: ReportInsightKind; text: string; basis: string } => isKind(i.kind) && i.text.length > 0)
    .slice(0, MAX_INSIGHTS)
    .map((i) => ({ id: makeId(), ...i, status: "pending" as const }));
}

/**
 * Applies the therapist's edits to the stored ideas: only the text and the
 * pending / validated / dismissed choice change, and only on ideas not yet written
 * into the report. Unknown ids are ignored; kind and basis stay the model's.
 */
export function editInsights(stored: ReportInsight[], edits: Pick<ReportInsight, "id" | "text" | "status">[]): ReportInsight[] {
  const byId = new Map(edits.map((e) => [e.id, e]));
  return stored.map((insight) => {
    const edit = byId.get(insight.id);
    if (!edit || insight.status === "applied" || edit.status === "applied") return insight;
    const text = edit.text.trim().slice(0, MAX_INSIGHT_LENGTH);
    return { ...insight, text: text || insight.text, status: edit.status };
  });
}

/** The ideas to write into the report: validated, with text. */
export function validatedInsights(insights: ReportInsight[]): ReportInsight[] {
  return insights.filter((i) => i.status === "validated" && i.text.trim());
}

/** Marks these ideas as written into the report. */
export function markApplied(insights: ReportInsight[], ids: string[]): ReportInsight[] {
  const done = new Set(ids);
  return insights.map((i) => (done.has(i.id) ? { ...i, status: "applied" } : i));
}

/** Rewrites the text of each idea (placeholder ↔ name). */
export function mapInsightText(insights: ReportInsight[], fn: (text: string) => string): ReportInsight[] {
  return insights.map((i) => ({ ...i, text: fn(i.text), basis: fn(i.basis) }));
}
