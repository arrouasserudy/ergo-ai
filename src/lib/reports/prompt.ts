import type { Child, ReportDocType, ReportRecipient, ReportSection, ReportTest } from "@/db/schema";
import { ageInMonths, type Locale } from "@/i18n";

/**
 * The model never sees the child's name: it writes this placeholder wherever it
 * names the child, and the server swaps in the name before storing the text.
 */
export const CHILD_PLACEHOLDER = "{{child}}";

/** At most this many past corrections are replayed as style examples. */
export const MAX_STYLE_EXAMPLES = 3;

const LANGUAGE: Record<Locale, string> = { fr: "French", he: "Hebrew", en: "English" };

/** Marker for information the notes do not give; the therapist fills it in. */
export const TO_COMPLETE: Record<Locale, string> = { fr: "[à compléter]", he: "[להשלמה]", en: "[to complete]" };

const DOC_TYPES: Record<ReportDocType, string> = {
  follow_up: "a follow-up report after a therapy session",
  initial_assessment: "an initial assessment report",
  letter: "a letter",
  recommendations: "a set of practical recommendations",
};

const RECIPIENTS: Record<ReportRecipient, { reader: string; tone: string; sections: string[] }> = {
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

/** Fixed per language, so identical across requests. */
export function reportSystemPrompt(language: Locale): string {
  return `You write reports for a pediatric occupational therapist, from her raw session notes. The notes are often terse: abbreviations, fragments, test scores, observations jotted down during the session. You turn them into a clear, well-structured professional text that she will review, correct and validate before sending it herself.

Rules:
- Use only facts present in the notes, the test results and the child context, and only the context that matters to this reader. Never invent an observation, a score, a date or a recommendation she did not mention. You may rephrase, group and order her content, but never add a recommendation, an activity, an example or an explanation of your own: if it is not in the notes, it is not in the report.
- When a section needs information that the notes do not give, write ${TO_COMPLETE[language]} instead of guessing.
- Never diagnose, and never present a hypothesis as a certainty.
- Refer to the child only as ${CHILD_PLACEHOLDER}, exactly as written, each time you name the child. Never invent a first name. For pronouns and grammatical gender, follow the notes; when they do not show it, choose neutral wording.
- Write in ${LANGUAGE[language]}, including section headings, whatever language the notes are in.

Output: a list of sections, each with a short heading and a body. The body is plain text that she will edit directly: paragraphs separated by a blank line, and "- " bullet lists with one item per line (no blank line between items). Use **bold** rarely, for at most one or two key words in the whole report, or not at all. No headings inside a body, no tables, no greeting or signature (the letterhead and signature are added at export), except for the parents version, whose first section may start with one friendly sentence (not a section of its own).`;
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

/** Replaces the placeholder the model wrote with the child's name. */
export function fillChildPlaceholder(sections: ReportSection[], name: string): ReportSection[] {
  const fill = (text: string) => text.split(CHILD_PLACEHOLDER).join(name);
  return sections.map((s) => ({ heading: fill(s.heading).trim(), body: fill(s.body).trim() }));
}
