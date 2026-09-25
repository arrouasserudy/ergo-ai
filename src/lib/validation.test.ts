import { describe, expect, it } from "vitest";
import { identitySchema, reportSchema, toFieldErrors } from "./validation";

const parse = (initials: string) => identitySchema.safeParse({ initials, referralReason: "x", birthDate: "", schoolLevel: "", followUpStart: "" });

describe("initials", () => {
  it.each([
    ["L. M.", "L. M."],
    ["LM", "L. M."],
    ["J.-B. D.", "J. B. D."],
    ["ל. מ.", "ל. מ."],
    ["ל״מ", "ל. מ."],
    ["ל מ", "ל. מ."],
  ])("accepts %s as %s", (input, expected) => {
    const r = parse(input);
    expect(r.success && r.data.initials).toBe(expected);
  });

  it.each(["Léa", "lea", "לאה", "שרה כהן"])("rejects the name %s", (input) => {
    const r = parse(input);
    expect(r.success).toBe(false);
    expect(!r.success && toFieldErrors(r.error).initials).toBe("initialsFormat");
  });
});

describe("error codes", () => {
  it("returns codes, not sentences", () => {
    const r = identitySchema.safeParse({ initials: "", referralReason: "x".repeat(201), birthDate: "", schoolLevel: "", followUpStart: "" });
    expect(!r.success && toFieldErrors(r.error)).toMatchObject({ initials: "required", referralReason: "tooLong:200" });
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
