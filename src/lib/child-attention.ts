/** "Needs attention" list of a child's overview tab (pure, tested). Episodes in progress are shown apart. */
import { urgency } from "@/lib/forms/deadlines";

type FormRow = { id: string; status: string; dueDate: string | null; schema: { title: string } };
type ReportRow = { id: string; status: string; docType: string; sessionDate: string; updatedAt: Date };
type AssessmentRow = { id: string; status: string; definitionId: string; testDate: string };

export type AttentionItem =
  | { kind: "form"; id: string; title: string; dueDate: string; level: "soon" | "overdue" }
  | { kind: "report"; id: string; docType: string; sessionDate: string }
  | { kind: "assessment"; id: string; definitionId: string; testDate: string };

type FormItem = Extract<AttentionItem, { kind: "form" }>;

/**
 * Forms overdue then due soon (earliest first, same rule as the bell), draft reports
 * (most recently touched first), then tests not completed yet (latest test date first).
 */
export function needsAttention({
  forms,
  reports,
  assessments,
  today,
  warnDays,
}: {
  forms: FormRow[];
  reports: ReportRow[];
  assessments: AssessmentRow[];
  today: string;
  warnDays: number;
}): AttentionItem[] {
  const due = forms
    .flatMap((form): FormItem[] => {
      const level = urgency(form.dueDate, today, warnDays, form.status === "submitted");
      return level === "none" || !form.dueDate ? [] : [{ kind: "form", id: form.id, title: form.schema.title, dueDate: form.dueDate, level }];
    })
    .sort((a, b) => Number(b.level === "overdue") - Number(a.level === "overdue") || a.dueDate.localeCompare(b.dueDate));
  const drafts = reports
    .filter((r) => r.status === "draft")
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
    .map((r): AttentionItem => ({ kind: "report", id: r.id, docType: r.docType, sessionDate: r.sessionDate }));
  const tests = assessments
    .filter((a) => a.status !== "completed")
    .sort((a, b) => b.testDate.localeCompare(a.testDate))
    .map((a): AttentionItem => ({ kind: "assessment", id: a.id, definitionId: a.definitionId, testDate: a.testDate }));
  return [...due, ...drafts, ...tests];
}
