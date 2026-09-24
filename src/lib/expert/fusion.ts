/**
 * Reciprocal Rank Fusion: merges ranked lists (vector search, full-text search)
 * without having to calibrate their scores against each other.
 */
export function reciprocalRankFusion<K>(lists: K[][], { k = 60, limit = 8 } = {}): K[] {
  const scores = new Map<K, number>();
  for (const list of lists) {
    list.forEach((key, rank) => scores.set(key, (scores.get(key) ?? 0) + 1 / (k + rank + 1)));
  }
  return [...scores.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([key]) => key);
}

/**
 * Turns free text into a safe FTS5 query: words of 3+ letters, quoted, OR-ed.
 * Quoting neutralises FTS5 syntax (AND, NEAR, *, :, quotes) typed by the model.
 */
export function toFtsQuery(text: string): string | null {
  const words = (text.toLowerCase().match(/[\p{L}\p{N}]{3,}/gu) ?? []).filter((w) => !STOPWORDS.has(w));
  const unique = [...new Set(words)].slice(0, 16);
  return unique.length ? unique.map((w) => `"${w}"`).join(" OR ") : null;
}

const STOPWORDS = new Set([
  "the", "and", "for", "with", "that", "this", "are", "from", "what", "how", "why", "which", "who", "can", "does",
  "children", "child", "study", "studies", "effect", "effects",
]);
