import { z } from "zod";

/**
 * Form convention (version 1). A form is a list of sections, each a list of typed fields.
 * Ids are assigned by the app (never by the model) and stay stable once the form is
 * attached to a child: answers are keyed by field id.
 */

export const FORM_LANGUAGES = ["fr", "he", "en"] as const;
export type FormLanguage = (typeof FORM_LANGUAGES)[number];

export const FIELD_TYPES = [
  "text",
  "textarea",
  "number",
  "date",
  "yes_no",
  "single_choice",
  "multi_choice",
  "scale",
  "matrix",
  "info",
] as const;
export type FieldType = (typeof FIELD_TYPES)[number];

export const MAX_FIELDS = 400;
export const MAX_OPTIONS = 60;
export const MAX_SECTIONS = 60;
const LABEL_MAX = 1000;

const label = z.string().trim().min(1, "required").max(LABEL_MAX, `tooLong:${LABEL_MAX}`);
const optionalLabel = z.string().trim().max(LABEL_MAX, `tooLong:${LABEL_MAX}`).optional();
const idString = z.string().regex(/^[a-z]\d{1,5}$/);

const option = z.object({ id: idString, label });
const options = z.array(option).min(1, "required").max(MAX_OPTIONS);

const base = {
  id: idString,
  label,
  help: optionalLabel,
  required: z.boolean(),
  /** Answer identifies the child or family (name, birth date, address…): never sent to the AI. */
  identifying: z.boolean().optional(),
};

const field = z.discriminatedUnion("type", [
  z.object({ ...base, type: z.enum(["text", "textarea", "date", "yes_no", "info"]) }),
  z.object({ ...base, type: z.literal("number"), unit: z.string().trim().max(40).optional() }),
  z.object({ ...base, type: z.enum(["single_choice", "multi_choice"]), options, allowOther: z.boolean() }),
  z
    .object({
      ...base,
      type: z.literal("scale"),
      min: z.number().int().min(0).max(1),
      max: z.number().int().min(2).max(10),
      minLabel: optionalLabel,
      maxLabel: optionalLabel,
    }),
  z.object({ ...base, type: z.literal("matrix"), rows: options, columns: options.max(12) }),
]);

const section = z.object({
  id: idString,
  title: optionalLabel,
  description: optionalLabel,
  fields: z.array(field).max(MAX_FIELDS),
});

export const formSchema = z
  .object({
    version: z.literal(1),
    title: z.string().trim().min(1, "required").max(200, "tooLong:200"),
    description: optionalLabel,
    language: z.enum(FORM_LANGUAGES),
    sections: z.array(section).min(1).max(MAX_SECTIONS),
  })
  .refine((f) => f.sections.reduce((n, s) => n + s.fields.length, 0) <= MAX_FIELDS, "tooManyFields")
  .refine((f) => {
    const ids = f.sections.flatMap((s) => s.fields.map((fl) => fl.id));
    return new Set(ids).size === ids.length;
  }, "duplicateIds");

export type FormSchema = z.infer<typeof formSchema>;
export type FormSection = FormSchema["sections"][number];
export type FormField = FormSection["fields"][number];
export type FormOption = { id: string; label: string };

/** Single and multiple choice: selected option ids, plus the free text of "Other". */
export type ChoiceAnswer = { selected: string[]; other?: string };
/** Matrix: row id → column id. */
export type MatrixAnswer = Record<string, string>;
export type Answer = string | number | boolean | ChoiceAnswer | MatrixAnswer;
export type Answers = Record<string, Answer>;

/** The option id used for "Other" in a choice answer. */
export const OTHER = "other";

export function allFields(form: FormSchema): FormField[] {
  return form.sections.flatMap((s) => s.fields);
}

/** Next free id with this prefix ("f12"), for fields, sections and options added in the editor. */
export function nextId(prefix: string, existing: Iterable<string>): string {
  let max = 0;
  for (const id of existing) {
    if (id.startsWith(prefix)) max = Math.max(max, Number(id.slice(prefix.length)) || 0);
  }
  return `${prefix}${max + 1}`;
}

/**
 * What the model returns: a flat shape with nullable properties (no unions), which both
 * Anthropic and OpenAI strict structured outputs accept. `normalizeForm` turns it into a
 * `FormSchema`.
 */
export const llmFormSchema = z.object({
  title: z.string(),
  description: z.string().nullable(),
  language: z.enum(FORM_LANGUAGES),
  sections: z.array(
    z.object({
      title: z.string().nullable(),
      description: z.string().nullable(),
      fields: z.array(
        z.object({
          type: z.enum(FIELD_TYPES),
          label: z.string(),
          help: z.string().nullable(),
          required: z.boolean(),
          identifying: z.boolean(),
          options: z.array(z.string()).nullable(),
          allow_other: z.boolean().nullable(),
          unit: z.string().nullable(),
          scale_min: z.number().nullable(),
          scale_max: z.number().nullable(),
          min_label: z.string().nullable(),
          max_label: z.string().nullable(),
          rows: z.array(z.string()).nullable(),
          columns: z.array(z.string()).nullable(),
        }),
      ),
    }),
  ),
});

export type LlmForm = z.infer<typeof llmFormSchema>;
