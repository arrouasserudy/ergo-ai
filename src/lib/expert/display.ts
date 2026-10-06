/**
 * Turns stored messages (Anthropic format, or the marker format of OpenAI and the
 * Claude subscription) into what the chat shows, and answer parts into markdown + numbered sources + the "limits" box.
 */
import type { ChatProvider } from "./providers/types";
import { partsFromAnthropic, partsFromMarkers, type AnswerPart, type CitablePassage } from "./answer";
import { LIMITS_MARKER } from "./system-prompt";

export type DisplayTurn = { role: "user"; text: string } | { role: "assistant"; parts: AnswerPart[] };

type Row = { role: string; content: unknown; isPrompt: boolean };

const CONTEXT_PREFIX = "Context about the child";

/** The text the therapist typed (the pseudonymized child context prefix is hidden). */
function promptText(content: unknown): string {
  const raw = content && typeof content === "object" && "content" in content ? (content as { content: unknown }).content : content;
  const text = typeof raw === "string" ? raw : Array.isArray(raw) ? raw.filter((b) => b?.type === "text").map((b) => b.text).join("\n") : "";
  if (!text.startsWith(CONTEXT_PREFIX)) return text;
  const cut = text.indexOf("\n\n");
  return cut === -1 ? text : text.slice(cut + 2);
}

function pushAnswer(turns: DisplayTurn[], parts: AnswerPart[]) {
  if (parts.length === 0) return;
  const last = turns.at(-1);
  if (last?.role === "assistant") last.parts.push(...parts);
  else turns.push({ role: "assistant", parts });
}

/**
 * One bubble per question and per answer: tool turns are hidden, and the assistant
 * turns of one answer (before/after searches) are merged.
 */
export function toDisplayTurns(rows: Row[], provider: ChatProvider = "anthropic"): DisplayTurn[] {
  const turns: DisplayTurn[] = [];
  // Marker providers: passages returned by searches, to resolve citation markers.
  const passages = new Map<string, CitablePassage>();
  for (const row of rows) {
    if (row.isPrompt) {
      turns.push({ role: "user", text: promptText(row.content) });
      continue;
    }
    if (provider !== "anthropic") {
      const msg = row.content as { role?: string; content?: unknown; passages?: CitablePassage[] };
      if (row.role === "tool") for (const p of msg.passages ?? []) passages.set(p.id, p);
      if (row.role === "assistant" && typeof msg.content === "string") pushAnswer(turns, partsFromMarkers(msg.content, passages));
      continue;
    }
    if (row.role === "assistant" && Array.isArray(row.content)) pushAnswer(turns, partsFromAnthropic(row.content));
  }
  return turns;
}

export type Source = { n: number; title: string; url: string; passages: string[] };

const LIMITS_PATTERN = new RegExp(`(?:\\*\\*)?\\[\\s*${LIMITS_MARKER.slice(1, -1)}\\s*\\](?:\\*\\*)?`, "i");

export type Answer = { markdown: string; limits: string | null; sources: Source[] };

/** Markdown with `[n](#cite-n)` markers after cited text, the numbered sources, and the limits paragraph. */
export function buildAnswer(parts: AnswerPart[]): Answer {
  const sources = new Map<string, Source>();
  let markdown = "";
  for (const part of parts) {
    markdown += part.text;
    const numbers: number[] = [];
    for (const c of part.citations) {
      let source = sources.get(c.source);
      if (!source) {
        source = { n: sources.size + 1, title: c.title, url: c.source.split("#")[0], passages: [] };
        sources.set(c.source, source);
      }
      if (c.citedText && !source.passages.includes(c.citedText)) source.passages.push(c.citedText);
      if (!numbers.includes(source.n)) numbers.push(source.n);
    }
    if (numbers.length) markdown += numbers.map((n) => ` [${n}](#cite-${n})`).join("");
  }

  // Models sometimes write the marker loosely ("[ LIMITS ]", "**[LIMITS]**").
  const marker = markdown.match(LIMITS_PATTERN);
  const at = marker?.index ?? -1;
  const limits = marker ? markdown.slice(at + marker[0].length).replace(/^[\s:—*-]+/, "").trim() || null : null;
  return { markdown: (at === -1 ? markdown : markdown.slice(0, at)).trim(), limits, sources: [...sources.values()] };
}
