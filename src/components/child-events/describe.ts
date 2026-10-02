import type { I18n } from "@/i18n";
import type { ChildEventKind } from "@/db/schema";

/** The short title of an event added on a child's file: its type, the report due, or the first line of an "other". */
export function childEventTitle(event: { kind: ChildEventKind; details: string | null; report: { docType: string } | null }, { t }: I18n): string {
  if (event.kind === "report_due" && event.report) return t.calendar.reportDue(t.reports.docType[event.report.docType] ?? event.report.docType);
  if (event.kind === "other" && event.details) {
    const line = event.details.split("\n")[0].trim();
    return line.length > 80 ? `${line.slice(0, 79)}…` : line;
  }
  return t.childEvents.kind[event.kind];
}

/** The note of an event, when it is not already its title. */
export function childEventNote(event: { kind: ChildEventKind; details: string | null }): string | null {
  if (!event.details) return null;
  if (event.kind !== "other") return event.details;
  const [, ...rest] = event.details.split("\n");
  return rest.join("\n").trim() || null;
}
