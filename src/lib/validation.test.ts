import { describe, expect, it } from "vitest";
import { identitySchema, reportSchema, toFieldErrors } from "./validation";

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
