import { describe, expect, it } from "vitest";
import { completion, formAnswersForPrompt, formAnswersText, missingRequired, sanitizeAnswers } from "./answers";
import type { FormSchema } from "./schema";

const form: FormSchema = {
  version: 1,
  title: "Intake",
  language: "fr",
  sections: [
    {
      id: "s1",
      title: "General",
      fields: [
        { id: "f1", type: "text", label: "School", required: true },
        { id: "f2", type: "yes_no", label: "Glasses", required: false },
        { id: "f3", type: "single_choice", label: "Hand", required: false, options: [{ id: "o1", label: "Left" }, { id: "o2", label: "Right" }], allowOther: true },
        { id: "f4", type: "info", label: "Thanks", required: false },
      ],
    },
    {
      id: "s2",
      title: "Sensory",
      fields: [
        {
          id: "f5",
          type: "matrix",
          label: "How often",
          required: true,
          rows: [{ id: "r1", label: "Covers ears" }, { id: "r2", label: "Avoids messy play" }],
          columns: [{ id: "c1", label: "Never" }, { id: "c2", label: "Often" }],
        },
        { id: "f6", type: "scale", label: "Sleep", required: false, min: 1, max: 5 },
      ],
    },
  ],
};

describe("sanitizeAnswers", () => {
  it("keeps only answers that fit their field", () => {
    const answers = sanitizeAnswers(form, {
      f1: "École Jaurès",
      f2: "yes",
      f3: { selected: ["o2", "o1", "zz"], other: "ignored" },
      f4: "x",
      f5: { r1: "c2", r9: "c1", r2: "c7" },
      f6: 9,
      unknown: "y",
    });
    expect(answers).toEqual({ f1: "École Jaurès", f3: { selected: ["o2"] }, f5: { r1: "c2" } });
  });

  it("keeps the other text only when Other is selected", () => {
    expect(sanitizeAnswers(form, { f3: { selected: ["other"], other: "Both" } })).toEqual({ f3: { selected: ["other"], other: "Both" } });
  });

  it("ignores garbage", () => {
    expect(sanitizeAnswers(form, "nope")).toEqual({});
    expect(sanitizeAnswers(form, { f1: "   " })).toEqual({});
  });
});

describe("missingRequired", () => {
  it("requires every row of a required matrix", () => {
    expect(missingRequired(form, { f1: "x", f5: { r1: "c1" } })).toEqual(["f5"]);
    expect(missingRequired(form, { f1: "x", f5: { r1: "c1", r2: "c2" } })).toEqual([]);
  });
});

describe("completion", () => {
  it("counts answerable fields only", () => {
    expect(completion(form, { f1: "x", f2: true })).toBeCloseTo(2 / 5);
  });
});

describe("formAnswersText", () => {
  it("lists answered questions by section", () => {
    const text = formAnswersText(form, { f1: "Jaurès", f2: false, f3: { selected: ["other"], other: "Both" }, f5: { r2: "c2" }, f6: 4 });
    expect(text).toBe(
      [
        "## General",
        "- School: Jaurès",
        "- Glasses: No",
        "- Hand: Other: Both",
        "## Sensory",
        "- How often:",
        "  - Avoids messy play: Often",
        "- Sleep: 4 / 5",
      ].join("\n"),
    );
  });

  it("is empty when nothing is answered", () => {
    expect(formAnswersText(form, {})).toBe("");
  });
});

describe("formAnswersForPrompt", () => {
  const intake: FormSchema = {
    version: 1,
    title: "Intake",
    language: "fr",
    sections: [
      {
        id: "s1",
        fields: [
          { id: "f1", type: "text", label: "Nom de l'enfant :", required: true, identifying: true },
          { id: "f2", type: "date", label: "Date de naissance :", required: true, identifying: true },
          { id: "f3", type: "textarea", label: "Vos inquiétudes :", required: false },
        ],
      },
    ],
  };

  it("leaves identifying answers out and redacts the names they contain", () => {
    const text = formAnswersForPrompt(
      intake,
      { f1: "Léo Martin", f2: "2019-02-03", f3: "Léo évite la cantine ; Martin, son père, s'inquiète. L. M. aussi." },
      "L. M.",
      "{{child}}",
    );
    expect(text).toBe("- Vos inquiétudes: {{child}} évite la cantine ; {{child}}, son père, s'inquiète. {{child}} aussi.");
    expect(text).not.toContain("2019");
  });
});
