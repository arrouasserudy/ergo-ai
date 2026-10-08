import type { Child, ReportDocType, ReportInsight, ReportRecipient, ReportSection, ReportTest } from "@/db/schema";
import { ageInMonths, type Locale } from "@/i18n";
import { MAX_INSIGHTS } from "./insights";
import { otGuidancePrompt } from "./ot";
import { replaceChildName, TO_COMPLETE } from "./text";

export { TO_COMPLETE };

/**
 * The model never sees the child's name: it writes this placeholder wherever it
 * names the child, and the server swaps in the name before storing the text.
 */
export const CHILD_PLACEHOLDER = "{{child}}";

/** At most this many past corrections are replayed as style examples. */
export const MAX_STYLE_EXAMPLES = 3;

const LANGUAGE: Record<Locale, string> = { fr: "French", he: "Hebrew", en: "English" };


const DOC_TYPES: Record<ReportDocType, string> = {
  follow_up: "a follow-up report after a therapy session",
  initial_assessment: "an initial assessment report",
  feeding_observation: "a feeding observation assessment (the child observed during a meal: posture, oral-motor skills, sensory responses to food, behaviour at the table)",
  home_visit: "a home visit report (the child's routines and environment at home, with practical adaptations)",
  parent_guidance: "a parent guidance session summary (what was discussed with the parents and the strategies agreed to try at home)",
  year_start_summary: "a start-of-year summary report (where the child stands at the start of the school year, and the therapy goals for the year)",
  year_end_summary: "an end-of-year summary report (progress over the school year, which goals were reached, and recommendations for next year)",
  recommendations: "a set of practical recommendations",
};

const RECIPIENTS: Record<ReportRecipient, { reader: string; tone: string; sections: string[] }> = {
  clinical: {
    reader: "the child's clinical record (the therapist's own documentation, readable by other health professionals)",
    tone: "Professional, precise and impersonal, in the observational register of clinical documentation (\"difficulty … was observed\", \"substantial support was needed\"). Use the field's professional terms instead of everyday wording. Organize the content so it is easy to see what was done in the session, how the child performed and what was observed. Concise: no explanations for lay readers, no warm opening sentence.",
    sections: ["Session activities", "Performance and observations", "Next steps"],
  },
  parents: {
    reader: "the child's parents",
    tone: "Simple, warm and reassuring. No jargon: explain any technical idea in everyday words. Start with what is going well, be honest about what is still hard, and end with a few concrete things to do at home.",
    sections: ["What is progressing", "What is still difficult", "At home this week"],
  },
  doctor: {
    reader: "the child's doctor (pediatrician or specialist)",
    tone: "Concise, clinical and factual, oriented towards observations and results. Use precise professional vocabulary, report test results as given, and keep it short.",
    sections: ["Context", "Observations and results", "Evolution", "Recommendations"],
  },
  school: {
    reader: "the child's teacher and school team",
    tone: "Practical and respectful of the teacher's expertise. Focus on what can be seen in class and on concrete classroom adjustments (seating, materials, breaks, instructions), each one directly usable.",
    sections: ["Context", "What you may notice in class", "Suggested classroom adjustments"],
  },
};

const INSIGHT_KINDS = `- "hypothesis": a plausible explanation of something observed (why it happened), worded as a possibility, never as a certainty or a diagnosis.
- "recommendation": something to do in therapy, at school or with the family, that fits what was observed.
- "home_activity": a concrete activity or adaptation the family can try at home.
- "to_check": what to observe, ask or assess next, within OT, to confirm or rule out a hypothesis.
- "refer": a finding worth raising with the doctor or another professional (eye specialist, speech therapist, psychologist…) for further assessment, as the team judges; never a diagnosis.`;

/** Rules shared by the draft and the rewrite: placeholder, language, format. */
function sharedRules(language: Locale): string {
  return `- Refer to the child only as ${CHILD_PLACEHOLDER}, exactly as written, each time you name the child. Never invent a first name. For pronouns and grammatical gender, follow the notes; when they do not show it, choose neutral wording.
- Write in ${LANGUAGE[language]}, including section headings, whatever language the notes are in, in the professional register of an experienced OT.
- Section bodies are plain text that she will edit directly: paragraphs separated by a blank line, and "- " bullet lists with one item per line (no blank line between items). Use **bold** only to highlight a significant finding of the notes, so she can spot it later: an unusual or marked difficulty, a clear change in function (progress or regression), a safety concern. Bold a short phrase, never a whole sentence, at most three in the whole report; none when nothing stands out. No headings inside a body, no tables, no greeting or signature (the letterhead and signature are added at export), except for the parents version, whose first section may start with one friendly sentence (not a section of its own).`;
}

/** The OT knowledge pack, when it has content for this language and document type. */
function guidance(language: Locale, docType: ReportDocType): string {
  const text = otGuidancePrompt(language, docType);
  return text ? `\n\nWhat an experienced pediatric OT knows and how she writes, to draw on:\n\n${text}` : "";
}

/** Fixed per (language, document type), so identical across requests. */
export function reportSystemPrompt(language: Locale, docType: ReportDocType): string {
  return `You are an experienced pediatric occupational therapist working with a colleague. From her raw session notes (often terse: abbreviations, fragments, test scores, observations jotted down during the session) you produce two separate things, which she reviews before anything is sent:

1. "sections": the report itself, in the polished, professional wording of an experienced OT.
2. "insights": your own clinical reasoning, shown to her apart from the report as ideas she validates one by one. Only the ideas she validates are later written into the report.

Rules for the report sections:
- Facts only: use only what is present in the notes, the test results, the questionnaires attached to the session and the child context, and only what matters to this reader. Never invent an observation, a score, a date or a recommendation she did not mention. Rephrase, group and order her content into a clear professional text; your own ideas go into "insights", never into the sections.
- Never state a session goal, a focus, a plan or a comparison with earlier sessions that the notes do not give: describe what was done (the activities) instead of why.
- Leave out a section the notes give nothing for (no plan noted: no next-steps section). Inside a section you keep, write ${TO_COMPLETE[language]} where a needed detail is missing (a date, a score) instead of guessing.
- Never diagnose, and never present a hypothesis as a certainty.

Rules for the insights (at most ${MAX_INSIGHTS}, the most useful first; fewer is better than weak ones; none when the notes give nothing to reason on):
- Each insight has a kind:
${INSIGHT_KINDS}
- Each insight rests on something actually written in the notes, tests or questionnaires: quote or summarize that observation in "basis". Never base an insight on something not given.
- Reason like a senior OT: link what was observed to the underlying components (sensory processing, regulation, postural control, praxis, fine motor, visual perception, executive functions, feeding, participation), consider the child's age and context, and suggest what a real OT would propose next. Prefer concrete, specific ideas over generic advice.
- Keep apart what can be done within therapy ("recommendation", "home_activity") and what to keep following or raise with someone else ("to_check", "refer"). A finding that may also be medical or neurological can get both: practical ideas for therapy and a point to follow.
- Never diagnose and never label the child. When something could be medical (pain, sleep, swallowing safety, weight, medication, vision, a regression), it gets a "refer" insight. One set of notes is not enough to conclude: unless it is a safety concern, suggest a referral when the difficulty seems consistent or marked, and otherwise what to observe next to know whether it is.
- Never blame the family or the school; recommendations are practical and respectful.
- "text" is written for her (a colleague), in a sentence or two, ready to be adapted into the report; "basis" is short.

Shared rules:
${sharedRules(language)}${guidance(language, docType)}`;
}

/** The submit step: the therapist's edited text and the ideas she validated, merged into one report. */
export function rewriteSystemPrompt(language: Locale, docType: ReportDocType): string {
  return `You are an experienced pediatric occupational therapist helping a colleague finish a report. She has reviewed and edited a draft, and validated some clinical ideas. You rewrite the report so that it includes those ideas.

Rules:
- Her text is final: keep every sentence, fact and wording of hers, in the same order. Change her text only where needed to integrate an idea smoothly (a linking word, a merged sentence). Never drop, soften or add facts.
- Integrate every validated idea once, in the section where it fits, adapted to the reader and in the same professional register:
  - "recommendation" and "home_activity": in the section of recommendations or of things to do at home; create such a section at the end when there is none.
  - "hypothesis": woven into the relevant observation as a possibility ("this may be related to…"), never as a certainty or a diagnosis.
  - "to_check": as a next step (what will be observed or assessed next).
  - "refer": as a suggestion to raise the finding with that professional for further assessment, never as a diagnosis.
- Add nothing else: no other idea, recommendation, example or explanation of your own.
${sharedRules(language)}${guidance(language, docType)}`;
}

export type StylePair = { before: ReportSection[]; after: ReportSection[] };

export type ReportPromptInput = {
  child: Pick<Child, "birthDate" | "referralReason" | "schoolLevel" | "followUpStart" | "interests">;
  docType: ReportDocType;
  recipient: ReportRecipient;
  sessionDate: string;
  notes: string;
  tests: ReportTest[];
  /** Most recent first; only the first MAX_STYLE_EXAMPLES are used. */
  examples: StylePair[];
  /** Completed questionnaires attached to the report: answers as text, child's name already replaced. */
  forms?: { title: string; text: string }[];
  /** Completed standardized tests: scores computed by the app, as text. */
  assessments?: { name: string; date: string; text: string }[];
};

export function sectionsToText(sections: ReportSection[]): string {
  return sections.map((s) => `## ${s.heading}\n${s.body}`).join("\n\n");
}

/** Pseudonymized: age, referral reason, school level. No name. */
function childContext(child: ReportPromptInput["child"], sessionDate: string): string[] {
  const lines: string[] = [];
  if (child.birthDate) {
    const months = ageInMonths(child.birthDate, new Date(`${sessionDate}T12:00:00`));
    lines.push(`- Age: ${months < 24 ? `${months} months` : `${Math.floor(months / 12)} years`}`);
  }
  lines.push(`- Reason for referral: ${child.referralReason}`);
  if (child.schoolLevel) lines.push(`- School level: ${child.schoolLevel}`);
  if (child.followUpStart) lines.push(`- Followed since: ${child.followUpStart}`);
  if (child.interests.length) lines.push(`- Interests: ${child.interests.join(", ")}`);
  return lines;
}

export function reportUserPrompt(input: ReportPromptInput): string {
  const brief = RECIPIENTS[input.recipient];
  const parts = [
    `Write ${DOC_TYPES[input.docType]} for ${brief.reader}.`,
    `Tone: ${brief.tone}`,
    `Suggested sections (rename, merge or drop them to fit the notes): ${brief.sections.join(" / ")}.`,
    `<child>\n${childContext(input.child, input.sessionDate).join("\n")}\n</child>`,
    `<session date="${input.sessionDate}">\n<notes>\n${input.notes.trim()}\n</notes>${
      input.tests.length ? `\n<tests>\n${input.tests.map((t) => `- ${t.name}: ${t.results}`).join("\n")}\n</tests>` : ""
    }\n</session>`,
  ];
  const forms = (input.forms ?? []).filter((f) => f.text.trim());
  if (forms.length) {
    parts.push(
      `Questionnaires filled in about the child (by the parents or the practice), attached to these notes. Use their answers as background facts, only where they matter to this report:\n<questionnaires>\n${forms
        .map((f) => `<questionnaire title="${f.title.replace(/"/g, "'")}">\n${f.text.trim()}\n</questionnaire>`)
        .join("\n")}\n</questionnaires>`,
    );
  }

  const assessments = (input.assessments ?? []).filter((a) => a.text.trim());
  if (assessments.length) {
    parts.push(
      `Standardized tests given to the child, attached to these notes. The scores were computed by the software from the test's own scoring rules: report them as given, never recompute them, and do not add interpretations the classification does not state:\n<standardized_tests>\n${assessments
        .map((a) => `<test name="${a.name.replace(/"/g, "'")}" date="${a.date}">\n${a.text.trim()}\n</test>`)
        .join("\n")}\n</standardized_tests>`,
    );
  }

  const examples = input.examples.slice(0, MAX_STYLE_EXAMPLES);
  if (examples.length) {
    parts.push(
      `Below are earlier drafts for the same kind of reader, each followed by the version the therapist corrected and validated. Match her corrected style: vocabulary, length, structure and tone. Never reuse their content: facts come only from the notes above.\n${examples
        .map((ex, i) => `<example index="${i + 1}">\n<draft>\n${sectionsToText(ex.before)}\n</draft>\n<corrected>\n${sectionsToText(ex.after)}\n</corrected>\n</example>`)
        .join("\n")}`,
    );
  }
  return parts.join("\n\n");
}

export type RewritePromptInput = {
  docType: ReportDocType;
  recipient: ReportRecipient;
  /** The therapist's current text, the child's name already replaced by the placeholder. */
  sections: ReportSection[];
  /** The validated ideas, same. */
  insights: Pick<ReportInsight, "kind" | "text" | "basis">[];
};

export function rewriteUserPrompt(input: RewritePromptInput): string {
  const brief = RECIPIENTS[input.recipient];
  return [
    `This is ${DOC_TYPES[input.docType]} for ${brief.reader}.`,
    `Tone: ${brief.tone}`,
    `<report>\n${sectionsToText(input.sections)}\n</report>`,
    `Ideas she validated, to integrate:\n<ideas>\n${input.insights
      .map((i) => `<idea kind="${i.kind}">\n${i.text.trim()}${i.basis.trim() ? `\n(based on: ${i.basis.trim()})` : ""}\n</idea>`)
      .join("\n")}\n</ideas>`,
  ].join("\n\n");
}

/**
 * Past corrections hold the name of the child they were written for: it is swapped
 * back for the placeholder before they are replayed to the model.
 */
export function pseudonymizeSections(sections: ReportSection[], childName: string): ReportSection[] {
  return sections.map((s) => ({ heading: replaceChildName(s.heading, childName, CHILD_PLACEHOLDER), body: replaceChildName(s.body, childName, CHILD_PLACEHOLDER) }));
}

/** Replaces the placeholder the model wrote with the child's name. */
export function fillChildPlaceholder(sections: ReportSection[], name: string): ReportSection[] {
  const fill = (text: string) => text.split(CHILD_PLACEHOLDER).join(name);
  return sections.map((s) => ({ heading: fill(s.heading).trim(), body: fill(s.body).trim() }));
}
