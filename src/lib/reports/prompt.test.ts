import { describe, expect, it } from "vitest";
import { CHILD_PLACEHOLDER, fillChildPlaceholder, MAX_STYLE_EXAMPLES, pseudonymizeSections, reportSystemPrompt, reportUserPrompt, type ReportPromptInput } from "./prompt";

const base: ReportPromptInput = {
  child: { birthDate: "2019-02-03", referralReason: "Motricité fine", schoolLevel: "CE1", followUpStart: "2026-01-15", interests: ["dinosaurs"] },
  docType: "follow_up",
  recipient: "parents",
  sessionDate: "2026-09-24",
  notes: "- boutonnage : 3 boutons sur 5 seul",
  tests: [],
  examples: [],
};

const example = (n: number) => ({ before: [{ heading: `Draft ${n}`, body: "x" }], after: [{ heading: `Corrected ${n}`, body: "y" }] });

describe("reportUserPrompt", () => {
  it("adapts the brief to the recipient", () => {
    expect(reportUserPrompt(base)).toContain("the child's parents");
    expect(reportUserPrompt({ ...base, recipient: "doctor" })).toContain("clinical");
    expect(reportUserPrompt({ ...base, recipient: "school" })).toContain("classroom");
  });

  it("includes notes, tests and the age at the session date", () => {
    const prompt = reportUserPrompt({ ...base, tests: [{ name: "BHK", results: "-1,5 DS" }] });
    expect(prompt).toContain("3 boutons sur 5");
    expect(prompt).toContain("- BHK: -1,5 DS");
    expect(prompt).toContain("- Age: 7 years");
  });

  it("attaches completed questionnaires, skipping empty ones", () => {
    const prompt = reportUserPrompt({ ...base, forms: [{ title: "Profil sensoriel", text: "- Bruit: Souvent" }, { title: "Vide", text: " " }] });
    expect(prompt).toContain('<questionnaire title="Profil sensoriel">\n- Bruit: Souvent\n</questionnaire>');
    expect(prompt).not.toContain("Vide");
    expect(reportUserPrompt(base)).not.toContain("<questionnaires>");
  });

  it("attaches computed test scores, to report as given", () => {
    const prompt = reportUserPrompt({ ...base, assessments: [{ name: "Sensory Profile 2", date: "2026-09-01", text: "Quadrants:\n- Seeking: 38/95" }] });
    expect(prompt).toContain('<test name="Sensory Profile 2" date="2026-09-01">\nQuadrants:\n- Seeking: 38/95\n</test>');
    expect(prompt).toContain("never recompute them");
    expect(reportUserPrompt(base)).not.toContain("<standardized_tests>");
  });

  it("replays at most MAX_STYLE_EXAMPLES corrections", () => {
    const prompt = reportUserPrompt({ ...base, examples: [1, 2, 3, 4, 5].map(example) });
    expect(prompt.match(/<example /g)).toHaveLength(MAX_STYLE_EXAMPLES);
    expect(prompt).toContain("Corrected 1");
    expect(prompt).not.toContain("Corrected 4");
  });

  it("has no style block without examples", () => {
    expect(reportUserPrompt(base)).not.toContain("<example");
  });
});

describe("reportSystemPrompt", () => {
  it("asks for the placeholder and the report language", () => {
    expect(reportSystemPrompt("fr")).toContain(CHILD_PLACEHOLDER);
    expect(reportSystemPrompt("fr")).toContain("[à compléter]");
    expect(reportSystemPrompt("he")).toContain("Write in Hebrew");
  });
});

describe("fillChildPlaceholder", () => {
  it("swaps in the name everywhere", () => {
    const [s] = fillChildPlaceholder([{ heading: "Bilan de {{child}}", body: "{{child}} tient son crayon. {{child}} progresse." }], "L. M.");
    expect(s).toEqual({ heading: "Bilan de L. M.", body: "L. M. tient son crayon. L. M. progresse." });
  });
});

describe("pseudonymizeSections", () => {
  it("puts the placeholder back in a past correction", () => {
    expect(pseudonymizeSections([{ heading: "Léa à la maison", body: "Léa Martin progresse ; bravo LÉA." }], "Léa Martin")).toEqual([
      { heading: `${CHILD_PLACEHOLDER} à la maison`, body: `${CHILD_PLACEHOLDER} progresse ; bravo ${CHILD_PLACEHOLDER}.` },
    ]);
  });
});
