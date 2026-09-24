/**
 * Events streamed from /api/expert/chat to the browser, one JSON object per line.
 * Shared by the route (producer) and the chat UI (consumer).
 */
import type { AnswerPart } from "./answer";

export type ChatEvent =
  | { type: "conversation"; id: string }
  | { type: "search"; query: string }
  | { type: "text"; text: string }
  /** A complete assistant message, as provider-neutral parts with citations. */
  | { type: "message"; parts: AnswerPart[] }
  | { type: "refusal" }
  | { type: "error"; code: "limit" | "unavailable" | "generic" }
  | { type: "done" };

/** Splits a streamed body into events; `rest` is the unfinished last line. */
export function parseEvents(buffer: string): { events: ChatEvent[]; rest: string } {
  const lines = buffer.split("\n");
  const rest = lines.pop() ?? "";
  const events: ChatEvent[] = [];
  for (const line of lines) {
    if (!line.trim()) continue;
    try {
      events.push(JSON.parse(line) as ChatEvent);
    } catch {
      // ignore a malformed line rather than breaking the whole answer
    }
  }
  return { events, rest };
}
