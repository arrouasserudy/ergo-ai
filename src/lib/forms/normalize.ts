import { MAX_FIELDS, MAX_OPTIONS, MAX_SECTIONS, type FormField, type FormLanguage, type FormOption, type FormSchema, type LlmForm } from "./schema";

type LlmField = LlmForm["sections"][number]["fields"][number];

const clean = (value: string | null | undefined, max = 1000): string | undefined => {
  const v = value
    ?.replace(/[ \t ]+/g, " ")
    .replace(/\s*\n\s*\n\s*/g, "\n\n")
    .trim()
    .slice(0, max);
  return v ? v : undefined;
};

function toOptions(labels: string[] | null, prefix: string, max = MAX_OPTIONS): FormOption[] {
  const seen = new Set<string>();
  const result: FormOption[] = [];
  for (const raw of labels ?? []) {
    const label = clean(raw);
    if (!label || seen.has(label.toLowerCase())) continue;
    seen.add(label.toLowerCase());
    result.push({ id: `${prefix}${result.length + 1}`, label });
    if (result.length === max) break;
  }
  return result;
}

/**
 * Leftovers of the paper answer area in a label: blanks ("____", "……"), empty boxes and a
 * trailing required mark. Returns the label and whether it was marked required.
 */
export function cleanLabel(label: string): { label: string; marked: boolean } {
  let text = label
    .replace(/[☐☑☒□■◻◯○]\s*/g, "")
    .replace(/(?:_{2,}|\.{4,}|…{2,})(?:\s*\/\s*(?:_+|\.+))*/g, "")
    .replace(/[ \t]+/g, " ")
    .trim();
  // "Question* :" / "Question ?*" → required; the punctuation stays as the document wrote it.
  const marked = /\*\s*[:?]?\s*$/.test(text);
  if (marked) text = text.replace(/\s*\*(\s*[:?]?\s*)$/, "$1");
  return { label: text.trim(), marked };
}

/** "Autre", "Other: ____", "אחר" as an option label. */
const OTHER_LABEL = /^(autres?|other|others|אחר|אחרת)(?!\p{L})\s*[:.…_]*\s*(\(.*\))?[\s_.…]*$/iu;

const clampInt = (value: number | null, min: number, max: number, fallback: number) =>
  value === null || !Number.isFinite(value) ? fallback : Math.min(max, Math.max(min, Math.round(value)));

/** One model field → one app field (falls back to a text field when a list is empty). */
function toField(raw: LlmField, id: string): FormField | null {
  const cleaned = raw.type === "info" ? { label: clean(raw.label), marked: false } : cleanLabel(clean(raw.label) ?? "");
  const label = cleaned.label;
  if (!label) return null;
  const base = {
    id,
    label,
    help: clean(raw.help),
    required: raw.type === "info" ? false : raw.required || cleaned.marked,
    ...(raw.identifying && raw.type !== "info" ? { identifying: true } : {}),
  };

  switch (raw.type) {
    case "single_choice":
    case "multi_choice": {
      // "Other" is the app's own option (with its text box), even when the model listed it.
      const labels = raw.options ?? [];
      const listed = labels.filter((l) => !OTHER_LABEL.test(l.trim()));
      const options = toOptions(listed, "o");
      if (options.length === 0) return { ...base, type: "text" };
      return { ...base, type: raw.type, options, allowOther: Boolean(raw.allow_other) || listed.length < labels.length };
    }
    case "matrix": {
      const rows = toOptions(raw.rows, "r");
      const columns = toOptions(raw.columns, "c", 12);
      if (rows.length === 0 || columns.length === 0) return { ...base, type: "textarea" };
      return { ...base, type: "matrix", rows, columns };
    }
    case "scale": {
      const min = clampInt(raw.scale_min, 0, 1, 1);
      return { ...base, type: "scale", min, max: clampInt(raw.scale_max, 2, 10, 5), minLabel: clean(raw.min_label), maxLabel: clean(raw.max_label) };
    }
    case "number":
      return { ...base, type: "number", unit: clean(raw.unit, 40) };
    default:
      return { ...base, type: raw.type };
  }
}

/**
 * Turns the model's output into a valid form: assigns ids (sections `s1`…, fields `f1`…
 * across the whole form, options `o1`/rows `r1`/columns `c1` per field), trims text, drops
 * empty fields and sections, and caps the number of sections. Throws "noFields" when nothing is left.
 */
export function normalizeForm(raw: LlmForm, fallbackTitle: string, fallbackLanguage: FormLanguage): FormSchema {
  let fieldCount = 0;
  const sections: FormSchema["sections"] = [];

  for (const rawSection of raw.sections) {
    const fields: FormField[] = [];
    for (const rawField of rawSection.fields) {
      if (fieldCount >= MAX_FIELDS) break;
      const field = toField(rawField, `f${fieldCount + 1}`);
      if (!field) continue;
      fields.push(field);
      fieldCount++;
    }
    if (fields.length === 0) continue;
    // Past the section limit, the remaining questions go into the last section.
    if (sections.length === MAX_SECTIONS) {
      sections[sections.length - 1].fields.push(...fields);
      continue;
    }
    sections.push({ id: `s${sections.length + 1}`, title: clean(rawSection.title), description: clean(rawSection.description), fields });
  }

  if (sections.length === 0) throw new Error("noFields");
  return {
    version: 1,
    title: clean(raw.title, 200) ?? fallbackTitle.slice(0, 200),
    description: clean(raw.description),
    language: raw.language ?? fallbackLanguage,
    sections,
  };
}
