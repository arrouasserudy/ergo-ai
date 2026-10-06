import { describe, expect, it } from "vitest";
import type { ReportInsight } from "@/db/schema";
import { editInsights, mapInsightText, markApplied, MAX_INSIGHTS, newInsights, validatedInsights } from "./insights";

const ids = () => {
  let n = 0;
  return () => `i${++n}`;
};

const insight = (id: string, status: ReportInsight["status"], text = `idea ${id}`): ReportInsight => ({ id, kind: "recommendation", text, basis: "obs", status });

describe("newInsights", () => {
  it("keeps known kinds with text, trimmed, pending, with fresh ids", () => {
    const result = newInsights(
      [
        { kind: "hypothesis", text: "  may be sensory  ", basis: " covers ears " },
        { kind: "diagnosis", text: "ASD", basis: "" },
        { kind: "to_check", text: "   ", basis: "x" },
      ],
      ids(),
    );
    expect(result).toEqual([{ id: "i1", kind: "hypothesis", text: "may be sensory", basis: "covers ears", status: "pending" }]);
  });

  it("caps the number of ideas", () => {
    const raw = Array.from({ length: MAX_INSIGHTS + 3 }, (_, i) => ({ kind: "recommendation", text: `r${i}`, basis: "" }));
    expect(newInsights(raw, ids())).toHaveLength(MAX_INSIGHTS);
  });
});

describe("editInsights", () => {
  it("changes text and choice only, ignores unknown ids and applied ideas", () => {
    const stored = [insight("a", "pending"), insight("b", "applied"), insight("c", "validated")];
    const result = editInsights(stored, [
      { id: "a", text: " edited ", status: "validated" },
      { id: "b", text: "changed", status: "dismissed" },
      { id: "c", text: "", status: "dismissed" },
      { id: "zzz", text: "new", status: "validated" },
    ]);
    expect(result).toEqual([insight("a", "validated", "edited"), insight("b", "applied"), insight("c", "dismissed")]);
  });

  it("never lets the client mark an idea applied", () => {
    expect(editInsights([insight("a", "pending")], [{ id: "a", text: "x", status: "applied" }])).toEqual([insight("a", "pending")]);
  });
});

describe("validatedInsights / markApplied", () => {
  it("sends only validated ideas, then marks them applied", () => {
    const stored = [insight("a", "validated"), insight("b", "dismissed"), insight("c", "pending"), insight("d", "applied")];
    const ideas = validatedInsights(stored);
    expect(ideas.map((i) => i.id)).toEqual(["a"]);
    expect(markApplied(stored, ["a"]).map((i) => i.status)).toEqual(["applied", "dismissed", "pending", "applied"]);
  });
});

describe("mapInsightText", () => {
  it("maps text and basis", () => {
    expect(mapInsightText([insight("a", "pending", "Léa covers ears")], (t) => t.replace("Léa", "{{child}}"))[0].text).toBe("{{child}} covers ears");
  });
});
