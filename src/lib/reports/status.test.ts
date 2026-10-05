import { describe, expect, it } from "vitest";
import { closedAt, deriveReportStatus, wasEdited } from "./status";

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

describe("closedAt", () => {
  const d = (h: number) => new Date(Date.UTC(2026, 9, 1, h));
  it("is null while the report is a draft", () => {
    expect(closedAt(["parents", "doctor"], [{ recipient: "parents", validatedAt: d(9), exportedAt: null }])).toBeNull();
    expect(closedAt([], [])).toBeNull();
  });
  it("is when the last selected recipient was validated", () => {
    expect(
      closedAt(
        ["parents", "doctor"],
        [
          { recipient: "parents", validatedAt: d(9), exportedAt: null },
          { recipient: "doctor", validatedAt: d(11), exportedAt: null },
          { recipient: "school", validatedAt: d(15), exportedAt: null },
        ],
      ),
    ).toEqual(d(11));
  });
  it("is the first export when that came earlier", () => {
    expect(
      closedAt(
        ["parents", "doctor"],
        [
          { recipient: "parents", validatedAt: d(9), exportedAt: d(10) },
          { recipient: "doctor", validatedAt: d(11), exportedAt: null },
        ],
      ),
    ).toEqual(d(10));
  });
});
