import { replaceChildName } from "@/lib/reports/text";
import { allFields, OTHER, type Answer, type Answers, type ChoiceAnswer, type FormField, type FormSchema, type MatrixAnswer } from "./schema";

const TEXT_MAX = 5000;

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

/** One answer checked against its field; null when it is empty or does not fit the field. */
function sanitizeAnswer(field: FormField, raw: unknown): Answer | null {
  switch (field.type) {
    case "info":
      return null;
    case "text":
    case "textarea": {
      if (typeof raw !== "string") return null;
      const v = raw.slice(0, TEXT_MAX);
      return v.trim() ? v : null;
    }
    case "date":
      return typeof raw === "string" && /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : null;
    case "number":
      return typeof raw === "number" && Number.isFinite(raw) ? raw : null;
    case "yes_no":
      return typeof raw === "boolean" ? raw : null;
    case "scale":
      return typeof raw === "number" && Number.isInteger(raw) && raw >= field.min && raw <= field.max ? raw : null;
    case "single_choice":
    case "multi_choice": {
      if (!isRecord(raw) || !Array.isArray(raw.selected)) return null;
      const valid = new Set([...field.options.map((o) => o.id), ...(field.allowOther ? [OTHER] : [])]);
      let selected = [...new Set(raw.selected.filter((id): id is string => typeof id === "string" && valid.has(id)))];
      if (field.type === "single_choice") selected = selected.slice(0, 1);
      const other = selected.includes(OTHER) && typeof raw.other === "string" ? raw.other.slice(0, TEXT_MAX) : undefined;
      if (selected.length === 0) return null;
      return other ? { selected, other } : { selected };
    }
    case "matrix": {
      if (!isRecord(raw)) return null;
      const rows = new Set(field.rows.map((r) => r.id));
      const columns = new Set(field.columns.map((c) => c.id));
      const result: MatrixAnswer = {};
      for (const [row, col] of Object.entries(raw)) {
        if (rows.has(row) && typeof col === "string" && columns.has(col)) result[row] = col;
      }
      return Object.keys(result).length ? result : null;
    }
  }
}

/** Keeps only the answers that belong to this form and fit their field (untrusted input). */
export function sanitizeAnswers(form: FormSchema, raw: unknown): Answers {
  if (!isRecord(raw)) return {};
  const result: Answers = {};
  for (const field of allFields(form)) {
    const answer = sanitizeAnswer(field, raw[field.id]);
    if (answer !== null) result[field.id] = answer;
  }
  return result;
}

/** A matrix counts as answered when every row is. */
export function isAnswered(field: FormField, answer: Answer | undefined): boolean {
  if (answer === undefined) return false;
  if (field.type === "matrix") return field.rows.every((r) => (answer as MatrixAnswer)[r.id] !== undefined);
  return true;
}

/** Ids of the required fields left empty (sanitized answers). */
export function missingRequired(form: FormSchema, answers: Answers): string[] {
  return allFields(form)
    .filter((f) => f.required && f.type !== "info" && !isAnswered(f, answers[f.id]))
    .map((f) => f.id);
}

/** Share of answerable fields with an answer, 0–1. */
export function completion(form: FormSchema, answers: Answers): number {
  const fields = allFields(form).filter((f) => f.type !== "info");
  if (fields.length === 0) return 1;
  return fields.filter((f) => answers[f.id] !== undefined).length / fields.length;
}

export type AnswerLabels = { yes: string; no: string; other: string };
const ENGLISH: AnswerLabels = { yes: "Yes", no: "No", other: "Other" };

/** An answer as display text; matrices are rendered row by row by the caller. */
export function answerText(field: FormField, answer: Answer, labels: AnswerLabels = ENGLISH): string {
  switch (field.type) {
    case "yes_no":
      return answer ? labels.yes : labels.no;
    case "number":
      return field.unit ? `${answer} ${field.unit}` : String(answer);
    case "scale":
      return `${answer} / ${field.max}`;
    case "single_choice":
    case "multi_choice": {
      const { selected, other } = answer as ChoiceAnswer;
      return selected
        .map((id) => (id === OTHER ? `${labels.other}${other?.trim() ? `: ${other.trim()}` : ""}` : field.options.find((o) => o.id === id)?.label ?? ""))
        .filter(Boolean)
        .join(", ");
    }
    case "matrix":
      return field.rows
        .filter((r) => (answer as MatrixAnswer)[r.id])
        .map((r) => `${r.label}: ${field.columns.find((c) => c.id === (answer as MatrixAnswer)[r.id])?.label ?? ""}`)
        .join("; ");
    default:
      return String(answer);
  }
}

/**
 * The answered questions as plain text (Markdown-like), for the report prompt.
 * Unanswered questions and static text are left out.
 */
export function formAnswersText(form: FormSchema, answers: Answers, labels: AnswerLabels = ENGLISH, { skipIdentifying = false } = {}): string {
  const lines: string[] = [];
  for (const section of form.sections) {
    const answered = section.fields.filter((f) => f.type !== "info" && answers[f.id] !== undefined && !(skipIdentifying && f.identifying));
    if (answered.length === 0) continue;
    if (section.title) lines.push(`## ${section.title}`);
    for (const field of answered) {
      const answer = answers[field.id];
      // "Question ?" and "Question :" are followed by the answer without another colon.
      const label = field.label.replace(/\s*:\s*$/, "");
      const colon = /[?.!]$/.test(label) ? "" : ":";
      if (field.type === "matrix") {
        lines.push(`- ${label}${colon}`);
        for (const row of field.rows) {
          const col = (answer as MatrixAnswer)[row.id];
          if (col) lines.push(`  - ${row.label}: ${field.columns.find((c) => c.id === col)?.label ?? ""}`);
        }
      } else {
        const text = answerText(field, answer, labels).trim();
        lines.push(text.includes("\n") ? `- ${label}${colon}\n  ${text.replace(/\n/g, "\n  ")}` : `- ${label}${colon} ${text}`);
      }
    }
  }
  return lines.join("\n");
}

/**
 * The answers as sent to the AI with a report: identifying questions are left out, and
 * the child's stored name, as well as every word of the identifying answers (the full
 * name the parents typed…), is replaced by `placeholder` in the other answers.
 */
export function formAnswersForPrompt(form: FormSchema, answers: Answers, childName: string, placeholder: string): string {
  const names = [
    childName,
    ...allFields(form)
      .filter((f) => f.identifying && (f.type === "text" || f.type === "textarea") && typeof answers[f.id] === "string")
      .map((f) => answers[f.id] as string),
  ];
  const text = formAnswersText(form, answers, ENGLISH, { skipIdentifying: true });
  return names.reduce((t, name) => replaceChildName(t, name, placeholder), text);
}
