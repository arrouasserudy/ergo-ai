import { z } from "zod";
import { t } from "@/i18n/fr";

const e = t.errors;

/** Empty strings from form fields become null. */
const optionalText = (max = 2000) =>
  z
    .string()
    .trim()
    .max(max, e.tooLong(max))
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .default(null);

const requiredText = (max = 200) => z.string().trim().min(1, e.required).max(max, e.tooLong(max));

const pastDate = z
  .string()
  .trim()
  .transform((v) => (v === "" ? null : v))
  .nullable()
  .default(null)
  .refine((v) => v === null || /^\d{4}-\d{2}-\d{2}$/.test(v), e.invalidDate)
  .refine((v) => v === null || v <= new Date().toISOString().slice(0, 10), e.futureDate);

const tagList = z
  .array(z.string().trim().min(1).max(60))
  .max(40)
  .transform((tags) => [...new Set(tags)]);

/**
 * Accepts 1–4 initials ("L. M.", "LM", "J.-B. D.") and normalizes them to "L. M.".
 * Lowercase letters are rejected so a first name like "Léa" cannot slip through.
 */
const initials = z
  .string()
  .trim()
  .min(1, e.required)
  .regex(/^(\p{Lu}\.?[\s.-]*){1,4}$/u, e.initialsFormat)
  .transform((v) => (v.match(/\p{Lu}/gu) ?? []).map((c) => `${c}.`).join(" "));

export const identitySchema = z.object({
  initials,
  birthDate: pastDate,
  referralReason: requiredText(200),
  schoolLevel: optionalText(80),
  followUpStart: pastDate,
});

export const historySchema = z.object({
  medicalHistory: optionalText(),
  birthHistory: optionalText(),
  surgicalHistory: optionalText(),
  geneticDiagnoses: optionalText(),
  familyHistory: optionalText(),
  familyComposition: optionalText(),
  siblingsCount: z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : Number(v)))
    .nullable()
    .default(null)
    .refine((v) => v === null || (Number.isInteger(v) && v >= 0 && v <= 20), e.invalidNumber),
  otherInfo: optionalText(),
});

export const sensorySchema = z.object({
  knownTriggers: optionalText(),
  hyperSensitivities: tagList,
  hypoReactivities: tagList,
  seeksDeepPressure: z.boolean(),
  backgroundFactors: tagList,
  warningSigns: optionalText(),
  calmingStrategies: tagList,
  interests: tagList,
});

export const sectionSchemas = {
  identity: identitySchema,
  history: historySchema,
  sensory: sensorySchema,
} as const;

export type Section = keyof typeof sectionSchemas;
export const SECTIONS = Object.keys(sectionSchemas) as Section[];

const TAG_FIELDS = new Set(["hyperSensitivities", "hypoReactivities", "backgroundFactors", "calmingStrategies", "interests"]);
const BOOLEAN_FIELDS = new Set(["seeksDeepPressure"]);

/** Turns FormData into the raw shape expected by a section schema. */
export function formDataToInput(section: Section, formData: FormData): Record<string, unknown> {
  const input: Record<string, unknown> = {};
  for (const key of Object.keys(sectionSchemas[section].shape)) {
    if (TAG_FIELDS.has(key)) input[key] = formData.getAll(key).map(String);
    else if (BOOLEAN_FIELDS.has(key)) input[key] = formData.get(key) === "on";
    else input[key] = String(formData.get(key) ?? "");
  }
  return input;
}

const email = z.string().trim().toLowerCase().pipe(z.email(e.invalidEmail));
const newPassword = z.string().min(8, e.passwordTooShort).max(128, e.tooLong(128));

export const loginSchema = z.object({
  email,
  password: z.string().min(1, e.required),
});

export const accountNameSchema = z.object({ name: requiredText(120) });

export const newTherapistSchema = z.object({
  name: requiredText(120),
  email,
  password: newPassword,
});

export const signupSchema = newTherapistSchema.extend({ accountName: requiredText(120) });

/** Reads the given string fields from FormData. */
export function formDataToStrings(formData: FormData, keys: string[]): Record<string, string> {
  return Object.fromEntries(keys.map((k) => [k, String(formData.get(k) ?? "")]));
}

export type FieldErrors = Partial<Record<string, string>>;

export function toFieldErrors(error: z.ZodError): FieldErrors {
  const errors: FieldErrors = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    errors[key] ??= issue.message;
  }
  return errors;
}
