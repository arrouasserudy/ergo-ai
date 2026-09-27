import { describe, expect, it } from "vitest";
import { identitySchema, passwordChangeSchema, reportSchema, toFieldErrors } from "./validation";

const parse = (name: string) => identitySchema.safeParse({ name, referralReason: "x", birthDate: "", schoolLevel: "", followUpStart: "" });

describe("name", () => {
  it.each([
    ["Léa Martin", "Léa Martin"],
    ["  Jean-Baptiste   Dupont ", "Jean-Baptiste Dupont"],
    ["שרה כהן", "שרה כהן"],
    ["L. M.", "L. M."],
  ])("accepts %s as %s", (input, expected) => {
    const r = parse(input);
    expect(r.success && r.data.name).toBe(expected);
  });
});

describe("error codes", () => {
  it("returns codes, not sentences", () => {
    const r = identitySchema.safeParse({ name: "", referralReason: "x".repeat(201), birthDate: "", schoolLevel: "", followUpStart: "" });
    expect(!r.success && toFieldErrors(r.error)).toMatchObject({ name: "required", referralReason: "tooLong:200" });
  });
});

describe("reportSchema", () => {
  const valid = { docType: "follow_up", sessionDate: "2026-09-24", notes: "x", tests: [], recipients: ["parents"], language: "fr" } as const;

  it("orders recipients and drops empty tests", () => {
    const r = reportSchema.safeParse({ ...valid, recipients: ["school", "parents"], tests: [{ name: "", results: " " }, { name: "BHK", results: "" }] });
    expect(r.success && r.data.recipients).toEqual(["parents", "school"]);
    expect(r.success && r.data.tests).toEqual([{ name: "BHK", results: "" }]);
  });

  it("requires a recipient and a valid date", () => {
    expect(reportSchema.safeParse({ ...valid, recipients: [] }).success).toBe(false);
    expect(reportSchema.safeParse({ ...valid, sessionDate: "24/09/2026" }).success).toBe(false);
    expect(reportSchema.safeParse({ ...valid, recipients: ["nurse"] }).success).toBe(false);
  });
});

describe("passwordChangeSchema", () => {
  const errors = (input: Record<string, string>) => {
    const parsed = passwordChangeSchema.safeParse(input);
    return parsed.success ? {} : toFieldErrors(parsed.error);
  };

  it("accepts a matching new password", () => {
    expect(errors({ currentPassword: "old", newPassword: "longenough", confirmPassword: "longenough" })).toEqual({});
  });

  it("flags a mismatch on the confirmation field", () => {
    expect(errors({ currentPassword: "old", newPassword: "longenough", confirmPassword: "different1" })).toEqual({ confirmPassword: "passwordMismatch" });
  });

  it("requires the current password and a long enough new one", () => {
    expect(errors({ currentPassword: "", newPassword: "short", confirmPassword: "short" })).toEqual({ currentPassword: "required", newPassword: "passwordTooShort" });
  });
});
