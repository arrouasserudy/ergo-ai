import { describe, expect, it } from "vitest";
import { assessmentResultsText } from "./prompt";

describe("assessmentResultsText", () => {
  it("writes totals with their maximum and band, or ages in months", () => {
    const text = assessmentResultsText([
      {
        id: "q",
        title: "Quadrants",
        bands: ["Less", "Same", "More"],
        rows: [
          { id: "a", label: "Seeking", value: 34, max: 95, unit: "points", missing: 0, band: 1 },
          { id: "b", label: "Avoiding", value: 20, max: 100, unit: "points", missing: 2, band: null },
        ],
      },
      { id: "o", title: "Play age", rows: [{ id: "c", label: "Overall", value: 20.25, unit: "months", missing: 0 }, { id: "d", label: "Dimension", value: null, unit: "months", missing: 2 }] },
      { id: "e", title: "Empty", rows: [] },
    ]);
    expect(text).toBe(
      [
        "Quadrants:",
        "- Seeking: 34/95 — Same",
        "- Avoiding: 20/100 (2 items unanswered, not classified)",
        "Play age:",
        "- Overall: 20.3 months",
        "- Dimension: not scored (2 items unanswered)",
      ].join("\n"),
    );
  });
});
