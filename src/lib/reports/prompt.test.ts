import { describe, expect, it } from "vitest";
import {
  CHILD_PLACEHOLDER,
  fillChildPlaceholder,
  MAX_STYLE_EXAMPLES,
  pseudonymizeSections,
  reportSystemPrompt,
  reportUserPrompt,
  rewriteSystemPrompt,
  rewriteUserPrompt,
  type ReportPromptInput,
} from "./prompt";

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
    expect(reportUserPrompt({ ...base, recipient: "clinical" })).toContain("clinical record");
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
    expect(reportSystemPrompt("fr", "follow_up")).toContain(CHILD_PLACEHOLDER);
    expect(reportSystemPrompt("fr", "follow_up")).toContain("[à compléter]");
    expect(reportSystemPrompt("he", "follow_up")).toContain("Write in Hebrew");
  });

  it("keeps facts in the sections and the model's own ideas in the insights", () => {
    const system = reportSystemPrompt("he", "initial_assessment");
    expect(system).toContain("your own ideas go into \"insights\", never into the sections");
    for (const kind of ["hypothesis", "recommendation", "home_activity", "to_check", "refer"]) expect(system).toContain(`"${kind}"`);
    expect(system).toContain("Never diagnose");
  });

  it("keeps therapy ideas and points to follow or refer apart", () => {
    const system = reportSystemPrompt("he", "follow_up");
    expect(system).toContain('"refer"');
    expect(system).toContain("One set of notes is not enough to conclude");
  });

  it("shows model reports for both readers, labelled", () => {
    for (const language of ["fr", "he", "en"] as const) {
      const system = reportSystemPrompt(language, "follow_up");
      expect(system).toContain('reader="clinical record"');
      expect(system).toContain('reader="parents"');
    }
  });

  it("drops empty sections and never infers a session goal", () => {
    const system = reportSystemPrompt("he", "follow_up");
    expect(system).toContain("Leave out a section the notes give nothing for");
    expect(system).toContain("Never state a session goal");
  });

  it("includes the vision and gaze domain", () => {
    expect(reportSystemPrompt("fr", "follow_up")).toContain("Visual attention, gaze and oculomotor skills");
  });

  it("is identical across requests (cacheable)", () => {
    expect(reportSystemPrompt("he", "follow_up")).toBe(reportSystemPrompt("he", "follow_up"));
  });
});

describe("rewrite prompts", () => {
  it("keeps the therapist's text and integrates only the validated ideas", () => {
    expect(rewriteSystemPrompt("he", "follow_up")).toContain("Her text is final");
    expect(rewriteSystemPrompt("he", "follow_up")).toContain("Write in Hebrew");
    const prompt = rewriteUserPrompt({
      docType: "follow_up",
      recipient: "parents",
      sections: [{ heading: "Progress", body: `${CHILD_PLACEHOLDER} buttons 3 of 5` }],
      insights: [{ kind: "home_activity", text: "Practise buttoning on a doll", basis: "3 of 5 buttons" }],
    });
    expect(prompt).toContain("the child's parents");
    expect(prompt).toContain(`## Progress\n${CHILD_PLACEHOLDER} buttons 3 of 5`);
    expect(prompt).toContain('<idea kind="home_activity">\nPractise buttoning on a doll\n(based on: 3 of 5 buttons)\n</idea>');
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
