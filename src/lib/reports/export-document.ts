import type { ReportDocType, ReportRecipient, ReportSection } from "@/db/schema";
import { createI18n, type Locale } from "@/i18n";
import { substituteName, substituteSections } from "./text";

/** Everything an exported report shows, shared by the PDF (print) and Word renderers. */
export type ExportDocument = {
  dir: "ltr" | "rtl";
  lang: Locale;
  /** Cabinet name, then the letterhead lines. */
  letterhead: string[];
  title: string;
  to: string;
  meta: string[];
  sections: ReportSection[];
  signature: string[];
  fileName: string;
};

export type ExportInput = {
  language: Locale;
  timeZone: string;
  docType: ReportDocType;
  recipient: ReportRecipient;
  sessionDate: string;
  initials: string;
  /** Typed at export, used in memory only. */
  firstName: string;
  accountName: string;
  letterhead: string | null;
  therapistName: string;
  sections: ReportSection[];
};

/** Wording comes from the report's language, not the interface's. */
export function buildExportDocument(input: ExportInput): ExportDocument {
  const i18n = createI18n(input.language, input.timeZone);
  const d = i18n.t.reports.document;
  const letterhead = [input.accountName, ...(input.letterhead ?? "").split("\n").map((l) => l.trim()).filter(Boolean)];
  const date = i18n.date(input.sessionDate);
  return {
    dir: i18n.dir,
    lang: input.language,
    letterhead,
    title: d.title[input.docType],
    to: d.to[input.recipient],
    meta: [d.child(substituteName(input.initials, input.initials, input.firstName)), d.session(date)],
    sections: substituteSections(input.sections, input.initials, input.firstName),
    signature: [input.therapistName, d.therapist],
    fileName: d.fileName(i18n.t.reports.docType[input.docType], i18n.t.reports.recipient[input.recipient], input.sessionDate),
  };
}
