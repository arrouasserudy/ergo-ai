import { describe, expect, it } from "vitest";
import { identitySchema, toFieldErrors } from "./validation";

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
