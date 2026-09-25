/**
 * Provider-neutral answer format: text parts, each with the citations that support it.
 * Claude produces them natively (search_result citations); for OpenAI they are
 * resolved from `[library:123]` markers against the passages actually retrieved.
 */
export type Citation = { source: string; title: string; citedText: string };
export type AnswerPart = { text: string; citations: Citation[] };

/** Passage metadata kept with OpenAI tool results, to resolve citation markers later. */
export type CitablePassage = { id: string; source: string; title: string; text: string };

/** Anthropic text blocks → parts (only search_result citations are kept). */
export function partsFromAnthropic(blocks: unknown[]): AnswerPart[] {
  const parts: AnswerPart[] = [];
  for (const b of blocks as { type?: string; text?: string; citations?: { type: string; source?: string; title?: string | null; cited_text?: string }[] | null }[]) {
    if (b?.type !== "text" || typeof b.text !== "string") continue;
    const citations = (b.citations ?? [])
      .filter((c) => c.type === "search_result_location" && c.source)
      .map((c) => ({ source: c.source!, title: c.title ?? c.source!, citedText: c.cited_text ?? "" }));
    parts.push({ text: b.text, citations });
  }
  return parts;
}

/**
 * Matches `[library:12]`, `[upload:3]`, grouped forms like `[library:12, upload:3]`, and
 * bare ids like `[12]` (smaller models often drop the prefix).
 */
const ID = String.raw`(?:(?:library|upload):)?\d+`;
export const MARKER = new RegExp(String.raw`\[(${ID}(?:\s*[,;]\s*${ID})*)\]`, "g");

/** A bare number counts only when it matches exactly one retrieved passage. */
function resolve(id: string, passages: Map<string, CitablePassage>): CitablePassage | undefined {
  if (!/^\d+$/.test(id)) return passages.get(id);
  const matches = [passages.get(`library:${id}`), passages.get(`upload:${id}`)].filter(Boolean);
  return matches.length === 1 ? matches[0] : undefined;
}

/**
 * Text with citation markers → parts. Markers are removed from the text; ids that were
 * never retrieved in this conversation are dropped (no invented sources).
 */
export function partsFromMarkers(text: string, passages: Map<string, CitablePassage>): AnswerPart[] {
  const parts: AnswerPart[] = [];
  let last = 0;
  for (const m of text.matchAll(MARKER)) {
    const ids = m[1].split(/\s*[,;]\s*/);
    const resolved = ids.map((id) => resolve(id, passages));
    // A bare "[3]" that isn't a retrieved passage is ordinary text, not a citation.
    if (ids.every((id) => /^\d+$/.test(id)) && !resolved.some(Boolean)) continue;
    const citations = resolved
      .filter((p): p is CitablePassage => Boolean(p))
      .map((p) => ({ source: p.source, title: p.title, citedText: p.text }));
    // Drop the space the model usually leaves before a marker.
    parts.push({ text: text.slice(last, m.index).replace(/\s+$/, ""), citations });
    last = m.index + m[0].length;
  }
  parts.push({ text: text.slice(last), citations: [] });
  return parts.filter((p) => p.text || p.citations.length);
}

/** For live streaming display: hide raw markers until the final parts arrive. */
export function stripMarkers(text: string): string {
  return text.replace(MARKER, "").replace(/\[(?:(?:library|upload):)?\d*$/, "");
}
