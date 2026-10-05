import type { ReportRecipient, ReportSection, ReportStatus } from "@/db/schema";

type VariantState = { recipient: ReportRecipient; validatedAt: Date | null; exportedAt: Date | null };

/**
 * A report is exported as soon as one of its versions was exported, validated once
 * every selected recipient has a validated version, and a draft otherwise.
 */
export function deriveReportStatus(recipients: ReportRecipient[], variants: VariantState[]): ReportStatus {
  const selected = variants.filter((v) => recipients.includes(v.recipient));
  if (selected.some((v) => v.exportedAt)) return "exported";
  if (recipients.length > 0 && recipients.every((r) => selected.some((v) => v.recipient === r && v.validatedAt))) return "validated";
  return "draft";
}

/** When the report stopped being a draft (as `deriveReportStatus` sees it), or null while it is one. */
export function closedAt(recipients: ReportRecipient[], variants: VariantState[]): Date | null {
  const selected = variants.filter((v) => recipients.includes(v.recipient));
  const times: number[] = selected.flatMap((v) => (v.exportedAt ? [v.exportedAt.getTime()] : []));
  const validated = recipients.map((r) => selected.find((v) => v.recipient === r && v.validatedAt)?.validatedAt?.getTime());
  if (recipients.length > 0 && validated.every((t) => t !== undefined)) times.push(Math.max(...(validated as number[])));
  return times.length ? new Date(Math.min(...times)) : null;
}

const normalize = (sections: ReportSection[]) => sections.map((s) => `${s.heading.trim()}\n${s.body.trim()}`).join("\n\n");

/** True when the therapist changed the generated text (whitespace aside). */
export function wasEdited(generated: ReportSection[], sections: ReportSection[]): boolean {
  return normalize(generated) !== normalize(sections);
}
