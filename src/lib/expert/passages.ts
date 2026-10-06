import type { CitablePassage } from "./answer";
import type { Passage } from "./retrieval";
import { citationTitle } from "./search-tool";

/** Passage metadata kept with a stored tool result, to resolve citation markers later. */
export function toCitable(p: Passage): CitablePassage {
  return { id: p.id, source: `${p.url}#${p.id}`, title: citationTitle(p), text: p.text };
}

/** Tool output for marker-citing providers: each passage starts with the id it must cite. */
export function formatPassages(passages: Passage[]): string {
  if (passages.length === 0) return "No relevant passages found in the library for this query.";
  return passages.map((p) => `[${p.id}] ${citationTitle(p)}\n${p.text}`).join("\n\n---\n\n");
}
