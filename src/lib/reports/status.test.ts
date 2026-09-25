import { describe, expect, it } from "vitest";
import { deriveReportStatus, wasEdited } from "./status";

const at = new Date("2026-09-24T10:00:00Z");

describe("deriveReportStatus", () => {
  it("is a draft until every selected recipient is validated", () => {
    expect(deriveReportStatus(["parents", "doctor"], [{ recipient: "parents", validatedAt: at, exportedAt: null }])).toBe("draft");
    expect(
      deriveReportStatus(
        ["parents", "doctor"],
        [
          { recipient: "parents", validatedAt: at, exportedAt: null },
          { recipient: "doctor", validatedAt: at, exportedAt: null },
        ],
      ),
    ).toBe("validated");
  });

  it("is exported once any selected version was exported", () => {
    expect(deriveReportStatus(["parents", "school"], [{ recipient: "parents", validatedAt: at, exportedAt: at }])).toBe("exported");
  });

  it("ignores versions of recipients no longer selected", () => {
    expect(deriveReportStatus(["doctor"], [{ recipient: "parents", validatedAt: at, exportedAt: at }])).toBe("draft");
  });
});

describe("wasEdited", () => {
  const s = [{ heading: "A", body: "texte" }];
  it("ignores surrounding whitespace", () => {
    expect(wasEdited(s, [{ heading: " A ", body: "texte\n" }])).toBe(false);
  });
  it("detects changes", () => {
    expect(wasEdited(s, [{ heading: "A", body: "texte corrigé" }])).toBe(true);
  });
});
