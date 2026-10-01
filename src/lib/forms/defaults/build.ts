import type { LlmForm } from "../schema";

/**
 * Helpers to write a built-in form by hand in the shape the model returns (`LlmForm`):
 * `normalizeForm` then assigns the ids, exactly as for a converted questionnaire.
 */

type LlmField = LlmForm["sections"][number]["fields"][number];
type LlmSection = LlmForm["sections"][number];
type Extra = { help?: string; required?: boolean; identifying?: boolean };

/** A form shipped with the app and kept in every cabinet's library (see `lib/forms/builtin.ts`). */
export type BuiltinFormDefinition = {
  /** Stable key stored on the cabinet's template (`form_templates.builtin_key`). Never change it. */
  key: string;
  /** Bump after any change of `source`: every cabinet's template is then replaced by the new version. */
  version: number;
  source: LlmForm;
};

const field = (type: LlmField["type"], label: string, extra: Extra = {}, rest: Partial<LlmField> = {}): LlmField => ({
  type,
  label,
  help: extra.help ?? null,
  required: extra.required ?? false,
  identifying: extra.identifying ?? false,
  options: null,
  allow_other: null,
  unit: null,
  scale_min: null,
  scale_max: null,
  min_label: null,
  max_label: null,
  rows: null,
  columns: null,
  ...rest,
});

export const text = (label: string, extra?: Extra) => field("text", label, extra);
export const textarea = (label: string, extra?: Extra) => field("textarea", label, extra);
export const date = (label: string, extra?: Extra) => field("date", label, extra);
export const yesNo = (label: string, extra?: Extra) => field("yes_no", label, extra);
export const info = (label: string) => field("info", label);
export const number = (label: string, unit: string | null, extra?: Extra) => field("number", label, extra, { unit });
export const single = (label: string, options: string[], extra?: Extra & { other?: boolean }) =>
  field("single_choice", label, extra, { options, allow_other: extra?.other ?? false });
export const multi = (label: string, options: string[], extra?: Extra & { other?: boolean }) =>
  field("multi_choice", label, extra, { options, allow_other: extra?.other ?? false });
export const scale = (label: string, min: number, max: number, minLabel: string, maxLabel: string, extra?: Extra) =>
  field("scale", label, extra, { scale_min: min, scale_max: max, min_label: minLabel, max_label: maxLabel });
export const matrix = (label: string, rows: string[], columns: string[], extra?: Extra) => field("matrix", label, extra, { rows, columns });

export const section = (title: string, fields: LlmField[], description: string | null = null): LlmSection => ({ title, description, fields });
