import { describe, expect, it } from "vitest";
import { cleanLabel, normalizeForm } from "./normalize";
import { formSchema, nextId, type LlmForm } from "./schema";

type LlmField = LlmForm["sections"][number]["fields"][number];

const field = (over: Partial<LlmField>): LlmField => ({
  type: "text",
  label: "Question",
  help: null,
  required: false,
  identifying: false,
  options: null,
  allow_other: null,
  unit: null,
  scale_min: null,
  scale_max: null,
  min_label: null,
  max_label: null,
  rows: null,
  columns: null,
  ...over,
});

const form = (fields: LlmField[][]): LlmForm => ({
  title: "  Questionnaire  ",
  description: null,
  language: "fr",
  sections: fields.map((f, i) => ({ title: i ? `Part ${i}` : null, description: null, fields: f })),
});

describe("normalizeForm", () => {
  it("assigns ids across the whole form and produces a valid schema", () => {
    const result = normalizeForm(
      form([
        [field({ label: "Name of the school" }), field({ type: "single_choice", label: "Hand", options: ["Left", "Right", "left", " "], allow_other: true })],
        [field({ type: "matrix", label: "Frequency", rows: ["Covers ears"], columns: ["Never", "Always"] })],
      ]),
      "fallback",
      "he",
    );
    expect(result.title).toBe("Questionnaire");
    expect(result.sections.map((s) => s.id)).toEqual(["s1", "s2"]);
    expect(result.sections.flatMap((s) => s.fields.map((f) => f.id))).toEqual(["f1", "f2", "f3"]);
    const choice = result.sections[0].fields[1];
    expect(choice.type === "single_choice" && choice.options).toEqual([
      { id: "o1", label: "Left" },
      { id: "o2", label: "Right" },
    ]);
    expect(formSchema.safeParse(result).success).toBe(true);
  });

  it("turns a listed Other option into the app's Other", () => {
    const result = normalizeForm(form([[field({ type: "multi_choice", options: ["Dessin", "Autre : ____"], allow_other: false })]]), "x", "fr");
    expect(result.sections[0].fields[0]).toMatchObject({ options: [{ id: "o1", label: "Dessin" }], allowOther: true });
    const he = normalizeForm(form([[field({ type: "single_choice", options: ["גן", "אחר"] })]]), "x", "he");
    expect(he.sections[0].fields[0]).toMatchObject({ options: [{ id: "o1", label: "גן" }], allowOther: true });
    const kept = normalizeForm(form([[field({ type: "single_choice", options: ["Autrement dit", "Non"] })]]), "x", "fr");
    expect(kept.sections[0].fields[0]).toMatchObject({ allowOther: false });
  });

  it("falls back to text fields when lists are empty, and clamps scales", () => {
    const result = normalizeForm(
      form([[field({ type: "multi_choice", options: [] }), field({ type: "matrix", rows: ["a"], columns: null }), field({ type: "scale", scale_min: -3, scale_max: 40 })]]),
      "fallback",
      "fr",
    );
    const [a, b, c] = result.sections[0].fields;
    expect(a.type).toBe("text");
    expect(b.type).toBe("textarea");
    expect(c.type === "scale" && [c.min, c.max]).toEqual([0, 10]);
  });

  it("drops empty labels and sections, never requires static text", () => {
    const result = normalizeForm(form([[field({ label: "  " })], [field({ type: "info", label: "Read this", required: true })]]), "Fallback", "fr");
    expect(result.sections).toHaveLength(1);
    expect(result.sections[0].fields[0]).toMatchObject({ id: "f1", type: "info", required: false });
  });

  it("throws when nothing is left", () => {
    expect(() => normalizeForm(form([[field({ label: "" })]]), "x", "fr")).toThrow("noFields");
  });
});

describe("nextId", () => {
  it("returns the next free id for a prefix", () => {
    expect(nextId("f", ["f1", "f9", "s3"])).toBe("f10");
    expect(nextId("o", [])).toBe("o1");
  });
});

describe("cleanLabel", () => {
  it("removes the paper answer area and reads the required mark", () => {
    expect(cleanLabel("Nom et prénom de l'enfant* : ______________________")).toEqual({ label: "Nom et prénom de l'enfant :", marked: true });
    expect(cleanLabel("Date de naissance : ___ / ___ / ______")).toEqual({ label: "Date de naissance :", marked: false });
    expect(cleanLabel("Quelles sont vos inquiétudes ?*")).toEqual({ label: "Quelles sont vos inquiétudes ?", marked: true });
    expect(cleanLabel("Porte des lunettes ? ☐")).toEqual({ label: "Porte des lunettes ?", marked: false });
  });

  it("marks cleaned-up labels as required in the form", () => {
    const result = normalizeForm(form([[field({ label: "School* : ____", required: false })]]), "x", "fr");
    expect(result.sections[0].fields[0]).toMatchObject({ label: "School :", required: true });
  });
});
