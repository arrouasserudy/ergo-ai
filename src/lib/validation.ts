import { z } from "zod";
import { GROUP_COLORS, REPORT_DOC_TYPES, REPORT_LANGUAGES, REPORT_RECIPIENTS } from "@/db/schema";

/**
 * Error messages are codes ("required", "tooLong:200"…), translated where they are
 * displayed (see `i18n.error`), so validation does not depend on the request locale.
 */
const e = {
  required: "required",
  tooLong: (max: number) => `tooLong:${max}`,
  invalidDate: "invalidDate",
  futureDate: "futureDate",
  invalidNumber: "invalidNumber",
  invalidEmail: "invalidEmail",
  passwordTooShort: "passwordTooShort",
  passwordMismatch: "passwordMismatch",
};

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

export const identitySchema = z.object({
  name: requiredText(100).transform((v) => v.replace(/\s+/g, " ")),
  birthDate: pastDate,
  referralReason: requiredText(200),
  schoolLevel: optionalText(80),
  followUpStart: pastDate,
  /** Checked against the account by the action (an unknown id is refused). */
  groupId: z
    .string()
    .trim()
    .max(64)
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .default(null),
});

/** A group of children (classroom, school, place of work). */
export const groupSchema = z.object({
  name: requiredText(80).transform((v) => v.replace(/\s+/g, " ")),
  place: optionalText(120),
  color: z.enum(GROUP_COLORS).catch("teal"),
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

/** Autosaved content of a crisis / everyday-difficulty entry. */
export const episodeSchema = z.object({
  situation: z
    .string()
    .trim()
    .max(80, e.tooLong(80))
    .transform((v) => (v === "" ? null : v))
    .nullable(),
  antecedent: optionalText(1000),
  behavior: optionalText(1000),
  notes: optionalText(2000),
  causes: tagList,
  helped: tagList,
});

export type EpisodeInput = z.input<typeof episodeSchema>;

/** Autosaved inputs of a report: notes, attached test results, recipients. */
export const reportSchema = z.object({
  docType: z.enum(REPORT_DOC_TYPES),
  sessionDate: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, e.invalidDate),
  notes: z.string().max(20000, e.tooLong(20000)),
  tests: z
    .array(z.object({ name: z.string().trim().max(120, e.tooLong(120)), results: z.string().trim().max(1000, e.tooLong(1000)) }))
    .max(20)
    .transform((tests) => tests.filter((t) => t.name || t.results)),
  recipients: z
    .array(z.enum(REPORT_RECIPIENTS))
    .min(1, e.required)
    .transform((r) => REPORT_RECIPIENTS.filter((k) => r.includes(k))),
  language: z.enum(REPORT_LANGUAGES),
  /** Completed child forms attached to the notes (checked against the child at generation). */
  formIds: z.array(z.string().max(64)).max(20).default([]),
  /** Completed OT tests whose computed scores are attached (checked against the child at generation). */
  assessmentIds: z.array(z.string().max(64)).max(20).default([]),
});

export type ReportInput = z.input<typeof reportSchema>;

/** A report version as edited by the therapist. */
export const reportSectionsSchema = z
  .array(z.object({ heading: z.string().max(200, e.tooLong(200)), body: z.string().max(10000, e.tooLong(10000)) }))
  .max(30);

const email = z.string().trim().toLowerCase().pipe(z.email(e.invalidEmail));
const newPassword = z.string().min(8, e.passwordTooShort).max(128, e.tooLong(128));

export const loginSchema = z.object({
  email,
  password: z.string().min(1, e.required),
});

export const accountNameSchema = z.object({ name: requiredText(120) });

export const letterheadSchema = z.object({ letterhead: optionalText(600) });

export const newTherapistSchema = z.object({
  name: requiredText(120),
  email,
  password: newPassword,
});

/** The signed-in therapist's own profile (settings page). */
export const profileSchema = z.object({ name: requiredText(120) });

export const passwordChangeSchema = z
  .object({
    currentPassword: z.string().min(1, e.required),
    newPassword,
    confirmPassword: z.string(),
  })
  .refine((v) => v.newPassword === v.confirmPassword, { message: e.passwordMismatch, path: ["confirmPassword"] });

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
