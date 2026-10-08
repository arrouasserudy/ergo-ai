import type { ReportDocType } from "@/db/schema";
import type { Locale } from "@/i18n";
import { OT_DOMAINS } from "./domains";
import { DOC_TYPE_GUIDES, REASONING_RULES } from "./reasoning";
import { STYLE as EN } from "./style/en";
import { STYLE as FR } from "./style/fr";
import { STYLE as HE } from "./style/he";
import type { StyleGuide } from "./types";

export const STYLE_GUIDES: Record<Locale, StyleGuide> = { fr: FR, he: HE, en: EN };

const bullets = (items: string[]) => items.map((item) => `- ${item}`).join("\n");

function reasoningParts(): string[] {
  const parts: string[] = [];
  if (REASONING_RULES.length) parts.push(`<clinical_reasoning>\n${bullets(REASONING_RULES.map((r) => r.text))}\n</clinical_reasoning>`);
  if (OT_DOMAINS.length) {
    parts.push(
      `<ot_domains>\n${OT_DOMAINS.map(
        (d) =>
          `<domain name="${d.title}">\nSigns in the notes:\n${bullets(d.signs)}\nPlausible explanations to consider:\n${bullets(d.hypotheses)}\nWhat to check next:\n${bullets(d.toCheck)}\nTypical recommendations:\n${bullets(d.recommendations)}\n</domain>`,
      ).join("\n")}\n</ot_domains>`,
    );
  }
  return parts;
}

function vocabulary(style: StyleGuide): string | null {
  if (!style.glossary.length) return null;
  return `<professional_vocabulary>\n${bullets(style.glossary.map((g) => `${g.term}: ${g.meaning}${g.avoid ? ` (instead of: ${g.avoid})` : ""}`))}\n</professional_vocabulary>`;
}

/**
 * The clinical half of the pack, for Amit's chat: how an OT reasons and the field's
 * vocabulary in this language, without the report-writing rules. Fixed per language.
 */
export function otReasoningPrompt(language: Locale): string {
  return [...reasoningParts(), vocabulary(STYLE_GUIDES[language])].filter(Boolean).join("\n\n");
}

/**
 * The OT knowledge pack as prompt text: clinical reasoning (shared), then how reports
 * are written in this language. Fixed per (language, docType), so it stays cacheable.
 */
export function otGuidancePrompt(language: Locale, docType: ReportDocType): string {
  const style = STYLE_GUIDES[language];
  const parts = reasoningParts();
  const guide = DOC_TYPE_GUIDES.find((g) => g.docType === docType);
  if (guide) parts.push(`<document_structure>\nUsual sections: ${guide.sections.join(" / ")}.\n${guide.notes}\n</document_structure>`);
  if (style.register.length) parts.push(`<writing_style>\n${bullets(style.register.map((r) => r.text))}\n</writing_style>`);
  const vocab = vocabulary(style);
  if (vocab) parts.push(vocab);
  if (style.phrasing.length) parts.push(`<phrasing>\n${bullets(style.phrasing.map((p) => `Instead of "${p.avoid}", write "${p.prefer}"`))}\n</phrasing>`);
  // Same document type first; each language has a clinical note and a parents version, so both registers show.
  const examples = style.examples.filter((e) => e.docType === docType).concat(style.examples.filter((e) => e.docType !== docType)).slice(0, 2);
  if (examples.length) {
    parts.push(
      `Model reports written by a senior OT, for register and structure only (never reuse their facts). Follow the register of the one written for the same reader as yours:\n${examples
        .map((e) => `<model_report doc_type="${e.docType}" reader="${e.recipient === "clinical" ? "clinical record" : e.recipient}">\n<notes>\n${e.notes}\n</notes>\n<report>\n${e.sections.map((s) => `## ${s.heading}\n${s.body}`).join("\n\n")}\n</report>\n</model_report>`)
        .join("\n")}`,
    );
  }
  return parts.join("\n\n");
}
