import type { ReportDocType, ReportSection } from "@/db/schema";

/**
 * The OT knowledge pack: what an experienced pediatric OT knows and how she writes.
 * Pure data, reviewed by a professional OT (every item has a stable `id` so the review
 * can point at it). Injected into the report system prompt by `index.ts`.
 */

/** One area of clinical reasoning (sensory processing, praxis, feeding…). Written in English for the model. */
export type OtDomain = {
  id: string;
  title: string;
  /** Observations in session notes that point to this domain. */
  signs: string[];
  /** Plausible explanations an OT would consider for those observations (never a diagnosis). */
  hypotheses: string[];
  /** What she would want to observe or ask next to confirm or rule them out. */
  toCheck: string[];
  /** Typical recommendations and activities (clinic, home, school). */
  recommendations: string[];
};

/** A general rule of clinical reasoning or of report writing. */
export type OtRule = { id: string; text: string };

/** One structure a document type is expected to follow. */
export type DocTypeGuide = { docType: ReportDocType; sections: string[]; notes: string };

/** A professional term in the report language. */
export type GlossaryEntry = { id: string; term: string; meaning: string; avoid?: string };

/** A wording to replace with a more professional one. */
export type PhrasingEntry = { id: string; avoid: string; prefer: string };

/** A gold example: raw notes and the report a senior OT would write from them. */
export type ExampleReport = { id: string; docType: ReportDocType; notes: string; sections: ReportSection[] };

/** How reports are written in one language (register, vocabulary, a model report). */
export type StyleGuide = {
  /** Register and conventions, written in English for the model, with examples in the language. */
  register: OtRule[];
  glossary: GlossaryEntry[];
  phrasing: PhrasingEntry[];
  examples: ExampleReport[];
};
