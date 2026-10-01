import { describe, expect, it } from "vitest";
import type { Child, Episode } from "@/db/schema";
import type { FormSchema } from "@/lib/forms/schema";
import { buildTimeline, type TimelineInput } from "@/lib/timeline/events";
import { CONTEXT_CAPS, childContextText, crisisContextText, fitContext, redactChildName, truncate, type ContextReport } from "./child-context";

const child = {
  id: "c1",
  name: "L. M.",
  birthDate: "2019-02-03",
  referralReason: "Fine motor skills",
  schoolLevel: "CE1",
  hyperSensitivities: ["noise", "clothing"],
  hypoReactivities: [],
  seeksDeepPressure: true,
  backgroundFactors: ["sleep"],
  knownTriggers: "Socks",
  warningSigns: null,
  calmingStrategies: ["quietCorner"],
  interests: ["dinosaurs"],
} as unknown as Child;

const crisis = (causes: string[]) =>
  ({ kind: "crisis", status: "closed", causes, helped: ["removeCause"], startedAt: new Date("2026-09-01T10:00:00Z"), antecedent: "Sarah took his socks" }) as unknown as Episode;

describe("childContextText", () => {
  it("never includes the name or free-text crisis notes", () => {
    const text = childContextText(child, [crisis(["clothing"]), crisis(["clothing"])], "Asia/Jerusalem");
    expect(text).not.toContain("L. M.");
    expect(text).not.toContain("Sarah");
    expect(text).toContain("Sensory hypersensitivities: noise, clothing");
    expect(text).toContain('most frequent trigger "clothing" (2/2)');
  });

  it("omits empty sections", () => {
    const text = childContextText(child, [], "Asia/Jerusalem");
    expect(text).not.toContain("hyporeactivity");
    expect(text).not.toContain("crises");
  });
});

describe("crisisContextText", () => {
  const now = new Date("2026-09-10T10:20:00Z");
  const current = {
    id: "now",
    kind: "crisis",
    status: "open",
    causes: ["noise", "his sister left"],
    helped: ["headphones"],
    startedAt: new Date("2026-09-10T10:05:00Z"),
    endedAt: null,
    antecedent: "L. M. was asked to put on his shoes",
    behavior: null,
    notes: "Screamed and hid under the table",
  } as unknown as Episode;
  const past = {
    ...crisis(["clothing"]),
    id: "p1",
    endedAt: new Date("2026-09-01T10:12:00Z"),
  } as unknown as Episode;

  it("describes the current crisis and each past one, with the notes", () => {
    const text = crisisContextText(child, current, [current, past], "Asia/Jerusalem", now);
    expect(text).toContain(
      'A crisis is happening right now: time of day: midday; going on for 15 min; possible causes checked so far: noise, his sister left; tried so far: headphones; just before: "the child was asked to put on his shoes"; notes: "Screamed and hid under the table".',
    );
    expect(text).toContain('- 9 days ago: time of day: midday; lasted 12 min; causes: clothing; what helped: removeCause; just before: "Sarah took his socks"');
    expect(text).not.toContain("L. M.");
  });

  it("includes the child's added sections", () => {
    const reports = [{ sessionDate: "2026-06-28", docType: "follow_up", status: "validated", variants: [{ recipient: "parents", generated: [], sections: [{ heading: "Bilan", body: "L. M. progresse." }], validatedAt: null, exportedAt: null }] }];
    const text = crisisContextText(child, current, [current], "Asia/Jerusalem", now, { reports });
    expect(text).toContain("Latest report (2026-06-28, follow up for parents, validated; shortened):\n- Bilan: the child progresse.");
  });

  it("says when there is no past crisis", () => {
    expect(crisisContextText(child, current, [current], "Asia/Jerusalem", now)).toContain("No past crisis recorded");
  });
});

describe("redactChildName", () => {
  it("replaces the full name and each part of it", () => {
    expect(redactChildName("Léa Martin a crié, puis Léa s'est calmée. Martine est venue.", "Léa Martin")).toBe(
      "the child a crié, puis the child s'est calmée. Martine est venue.",
    );
  });

  it("replaces initials only as a whole", () => {
    expect(redactChildName("L. M. a pleuré. La maîtresse est là.", "L. M.")).toBe("the child a pleuré. La maîtresse est là.");
  });

  it("redacts initials typed in a chat message", () => {
    expect(redactChildName("comment faire manger J C? JC et j.c. aussi, je sais", "J. C.")).toBe(
      "comment faire manger the child? the child et the child aussi, je sais",
    );
  });
});

describe("childContextText: background, tests, report, dates", () => {
  const jc = {
    ...child,
    name: "Jules Cohen",
    birthDate: "2019-02-03",
    medicalHistory: "  Otites à répétition.\n Jules est suivi en neuropédiatrie, J. C. dort mal.  ",
    birthHistory: null,
    surgicalHistory: "",
    geneticDiagnoses: "TSA",
    familyHistory: null,
    familyComposition: "Vit avec ses parents et Sarah, sa sœur.",
    siblingsCount: 1,
    otherInfo: null,
  } as unknown as Child;

  const form: FormSchema = {
    version: 1,
    title: "Anamnèse",
    language: "fr",
    sections: [
      {
        id: "s1",
        fields: [
          { id: "f1", type: "date", label: "Date de naissance :", required: false },
          { id: "f2", type: "date", label: "Date du diagnostic :", required: false },
          { id: "f3", type: "date", label: "Premiers pas de Jules", required: false },
          { id: "f4", type: "date", label: "Échographie", required: false },
          { id: "f5", type: "text", label: "Commentaire", required: false },
          { id: "f6", type: "date", label: "Naissance de la mère", required: false, identifying: true },
        ],
      },
    ],
  };
  const group = (seeking: number) => [
    { id: "q", title: "Quadrants", bands: ["Less", "Same", "More"], rows: [{ id: "a", label: "Seeking", value: seeking, max: 95, unit: "points" as const, missing: 0, band: 2 }] },
  ];
  const timeline = (over: Partial<TimelineInput> = {}) =>
    buildTimeline({
      child: { id: "c1", birthDate: "2019-02-03", followUpStart: "2024-09-01", createdAt: "2024-09-01 08:00:00" },
      episodes: [],
      reports: [],
      forms: [
        {
          id: "cf1",
          schema: form,
          answers: { f1: "2019-02-03", f2: "2022-05-10", f3: "2020-03-01", f4: "2018-12-01", f5: "Jules aime Sarah", f6: "1990-04-02" },
          submittedAt: null,
          submittedBy: null,
          sentAt: null,
        },
      ],
      assessments: [
        // Extra fields as stored in the DB: answers and comments must never be read.
        { id: "a1", definitionId: "test-x", testDate: "2024-10-15", status: "completed", scores: group(60), answers: { comments: { x: "Jules secret comment" } } },
        { id: "a2", definitionId: "test-x", testDate: "2025-10-15", status: "completed", scores: group(50) },
        { id: "a3", definitionId: "test-x", testDate: "2026-01-15", status: "draft", scores: null },
        { id: "a4", definitionId: "test-x", testDate: "2023-01-10", status: "completed", scores: group(70) },
        { id: "a5", definitionId: "test-x", testDate: "2022-01-10", status: "completed", scores: group(80) },
      ] as TimelineInput["assessments"],
      timeZone: "Asia/Jerusalem",
      ...over,
    });
  const variant = (body: string, over: Partial<ContextReport["variants"][number]> = {}) => ({
    recipient: "parents",
    generated: [{ heading: "Draft", body: "generated text" }],
    sections: [
      { heading: "Ce qui avance", body },
      { heading: "À la maison", body: "**Jules** peut jouer avec J C." },
    ],
    validatedAt: null,
    exportedAt: null,
    ...over,
  });
  const reports: ContextReport[] = [
    { sessionDate: "2026-09-01", docType: "follow_up", status: "draft", variants: [variant("Brouillon récent")] },
    { sessionDate: "2026-06-28", docType: "year_end_summary", status: "validated", variants: [variant("Jules Cohen tient son crayon.", { validatedAt: new Date() })] },
    { sessionDate: "2024-10-09", docType: "initial_assessment", status: "exported", variants: [variant("Ancien", { exportedAt: new Date() })] },
  ];

  it("adds each section, with the child's name and initials redacted", () => {
    const text = childContextText(jc, [], "Asia/Jerusalem", { timeline: timeline(), reports });
    for (const name of ["Jules", "Cohen", "J. C.", "J C"]) expect(text).not.toContain(name);
    expect(text).toContain("Background:\n- Medical history: Otites à répétition. the child est suivi en neuropédiatrie, the child dort mal.");
    expect(text).toContain("- Genetic diagnoses: TSA");
    // Other names typed by the therapist are sent as written.
    expect(text).toContain("- Family composition: Vit avec ses parents et Sarah, sa sœur. (siblings: 1)");
    expect(text).not.toContain("Surgical history");
    expect(text).toContain("OT test results (scores computed by the app, latest first):\n- test-x, 2025-10 (age 6 years): Seeking: 50/95 (More)\n- test-x, 2024-10 (age 5 years): Seeking: 60/95 (More)\n- test-x, 2023-01 (age 3 years): Seeking: 70/95 (More)");
    expect(text).not.toContain("80/95");
    expect(text).not.toContain("secret");
    expect(text).toContain("Latest report (2026-06-28, year end summary for parents, validated; shortened):\n- Ce qui avance: the child tient son crayon.\n- À la maison: the child peut jouer avec the child");
    expect(text).toContain("Key dates (from the forms):\n- Date du diagnostic: 2022-05 (age 3 years)\n- Premiers pas de the child: 2020-03 (age 12 months)\n- Échographie: 2018-12 (before birth)");
    expect(text).not.toContain("Date de naissance");
    expect(text).not.toContain("Naissance de la mère");
    expect(text.indexOf("Background:")).toBeLessThan(text.indexOf("OT test results"));
    expect(text.indexOf("OT test results")).toBeLessThan(text.indexOf("Latest report"));
    expect(text.indexOf("Latest report")).toBeLessThan(text.indexOf("Key dates"));
  });

  it("omits every section without data", () => {
    const empty = { ...jc, medicalHistory: null, geneticDiagnoses: null, familyComposition: null, siblingsCount: null } as Child;
    const text = childContextText(empty, [], "Asia/Jerusalem", { timeline: timeline({ forms: [], assessments: [] }), reports: [] });
    for (const heading of ["Background", "OT test results", "Latest report", "Key dates"]) expect(text).not.toContain(heading);
    expect(childContextText(empty, [], "Asia/Jerusalem")).toBe(text);
  });

  it("falls back to a draft, and to the generated text when the edited one is empty", () => {
    const drafts: ContextReport[] = [
      { sessionDate: "2026-09-01", docType: "follow_up", status: "draft", variants: [variant("", { sections: [{ heading: "x", body: " " }] })] },
    ];
    expect(childContextText(jc, [], "Asia/Jerusalem", { reports: drafts })).toContain("Latest report (2026-09-01, follow up for parents, draft; shortened):\n- Draft: generated text");
  });

  it("truncates long fields and report sections, and caps each section", () => {
    const long = "mot ".repeat(400);
    const big = { ...jc, medicalHistory: long, birthHistory: long, surgicalHistory: long, familyHistory: long, otherInfo: long } as Child;
    const many = [{ heading: "A", body: long }, { heading: "B", body: long }, { heading: "C", body: long }, { heading: "D", body: long }, { heading: "E", body: long }];
    const text = childContextText(big, [], "Asia/Jerusalem", {
      reports: [{ sessionDate: "2026-06-28", docType: "follow_up", status: "validated", variants: [variant("", { sections: many })] }],
    });
    const background = text.slice(text.indexOf("Background:"), text.indexOf("\n\nLatest report"));
    expect(background.length).toBeLessThanOrEqual(CONTEXT_CAPS.background);
    expect(background).toContain("- Medical history: mot mot");
    expect(background.split("\n")[1].length).toBeLessThanOrEqual(CONTEXT_CAPS.backgroundField + "- Medical history: ".length);
    expect(background.split("\n")[1].endsWith("mot…")).toBe(true);
    const report = text.slice(text.indexOf("Latest report"));
    expect(report.length).toBeLessThanOrEqual(CONTEXT_CAPS.report);
    expect(report.split("\n")[1].length).toBeLessThanOrEqual(CONTEXT_CAPS.reportSection + "- A: ".length);
    expect(text.length).toBeLessThanOrEqual(CONTEXT_CAPS.total);
  });

  it("keeps only the 8 most recent form dates", () => {
    const fields = Array.from({ length: 10 }, (_, i) => ({ id: `d${i}`, type: "date" as const, label: `Date ${i}`, required: false }));
    const answers = Object.fromEntries(fields.map((f, i) => [f.id, `202${i % 10}-01-15`]));
    const events = timeline({ assessments: [], forms: [{ id: "cf", schema: { ...form, sections: [{ id: "s", fields }] }, answers, submittedAt: null, submittedBy: null, sentAt: null }] });
    const text = childContextText(jc, [], "Asia/Jerusalem", { timeline: events });
    const lines = text.slice(text.indexOf("Key dates")).split("\n").slice(1);
    expect(lines).toHaveLength(CONTEXT_CAPS.dates);
    expect(lines[0]).toBe("- Date 9: 2029-01 (age 9 years)");
    expect(text).not.toContain("Date 1:");
  });
});

describe("fitContext", () => {
  const lines = (heading: string, n: number, size: number) => [heading, ...Array.from({ length: n }, (_, i) => `- ${i} ${"x".repeat(size)}`)];
  const profile = ["Context:", "- Age: 7 years"];

  it("keeps everything under the cap", () => {
    const sections = { background: lines("Background:", 2, 10), tests: lines("Tests:", 1, 10), report: lines("Report:", 2, 10), dates: lines("Dates:", 1, 10) };
    expect(fitContext(profile, sections)).toBe([profile, ...Object.values(sections)].map((l) => l.join("\n")).join("\n\n"));
  });

  it("shortens then drops the report first, then the background, dates and tests", () => {
    const sections = { background: lines("Background:", 4, 290), tests: lines("Tests:", 3, 200), report: lines("Report:", 4, 390), dates: lines("Dates:", 8, 60) };
    // ~1200 + ~600 + ~1600 + ~530: fits once the report is shortened.
    const shortened = fitContext(profile, { ...sections, report: lines("Report:", 8, 390) });
    expect(shortened.length).toBeLessThanOrEqual(CONTEXT_CAPS.total);
    expect(shortened).toContain("Report:\n- 0");
    expect(shortened.slice(shortened.indexOf("Report:"), shortened.indexOf("Dates:"))).not.toContain("- 7 ");
    expect(shortened).toContain("Dates:");

    const huge = { background: lines("Background:", 10, 600), tests: lines("Tests:", 3, 200), report: lines("Report:", 8, 390), dates: lines("Dates:", 8, 60) };
    const text = fitContext(profile, huge);
    expect(text.length).toBeLessThanOrEqual(CONTEXT_CAPS.total);
    expect(text).not.toContain("Report:");
    expect(text).toContain("Background:");
    expect(text).toContain("Tests:\n- 0");
    expect(text).toContain("Dates:\n- 0");
  });

  it("drops tests last and cuts the profile itself only as a last resort", () => {
    const text = fitContext(["Context:", `- Triggers: ${"y ".repeat(3000)}`], { background: lines("Background:", 1, 10), tests: lines("Tests:", 1, 10), report: [], dates: [] });
    expect(text.length).toBeLessThanOrEqual(CONTEXT_CAPS.total);
    expect(text).not.toContain("Tests:");
    expect(text.endsWith("…")).toBe(true);
  });
});

describe("truncate", () => {
  it("collapses whitespace and cuts at a word with an ellipsis", () => {
    expect(truncate("  a  b\n c ", 10)).toBe("a b c");
    expect(truncate("alpha beta gamma delta", 14)).toBe("alpha beta…");
  });
});
