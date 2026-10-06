import type { StoredMessage } from "./providers/types";

/** Text of a stored turn in the marker format ({role, content: string}), or "". */
function text(m: StoredMessage): string {
  const c = (m.content as { content?: unknown } | null)?.content;
  return typeof c === "string" ? c : "";
}

const TAGS = { user: "colleague", assistant: "you", tool: "search_results" } as const;

/**
 * Subscription sessions are not kept between requests: earlier turns are replayed as a
 * transcript before the new message. Search results are included so their ids can
 * still be cited.
 */
export function transcriptPrompt(history: StoredMessage[], prompt: string): string {
  const turns = history
    .map((m) => ({ tag: TAGS[m.role], body: text(m).trim() }))
    .filter((t) => t.body)
    .map((t) => `<${t.tag}>\n${t.body}\n</${t.tag}>`);
  if (turns.length === 0) return prompt;
  return `Earlier in this conversation:\n\n${turns.join("\n\n")}\n\nYour colleague's new message:\n\n${prompt}`;
}
