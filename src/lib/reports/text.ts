import type { ReportSection } from "@/db/schema";

/**
 * Text helpers shared by the browser and the server. The first name typed at export
 * is only ever substituted in the browser, and never sent to the server.
 */

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Matches the child's stored name ("Léa Martin", or initials "L. M." also typed as
 * "L.M." or "L. M"), not preceded or followed by a letter, so "L. M." inside a word is left alone.
 */
function namePattern(childName: string, flags = "gu"): RegExp | null {
  const words = childName.split(/[\s.-]+/).filter(Boolean);
  if (words.length === 0) return null;
  // Words separated by optional dots/spaces/hyphens; initials may end with a dot.
  const isInitials = words.every((w) => [...w].length === 1);
  const pattern = words.map(escapeRegExp).join("[\\s.-]*") + (isInitials ? "\\.?" : "");
  return new RegExp(`(?<![\\p{L}])${pattern}(?![\\p{L}])`, flags);
}

/** Replaces the child's stored name with the first name. An empty first name leaves the text unchanged. */
export function substituteName(text: string, childName: string, firstName: string): string {
  const replacement = firstName.trim();
  const pattern = namePattern(childName);
  return replacement && pattern ? text.replace(pattern, replacement) : text;
}

/** Name particles never matched on their own ("de", "Le", "Ben"…): they are ordinary words. */
const PARTICLES = new Set(["de", "du", "des", "la", "le", "les", "el", "al", "da", "di", "do", "dos", "van", "von", "der", "den", "ben", "bat", "bar", "bin", "ibn"]);

/** Strips accents ("é" → "e", Hebrew vowel points), with a map from each folded character back to the original text. */
function fold(text: string): { folded: string; origin: number[] } {
  let folded = "";
  const origin: number[] = [];
  let i = 0;
  for (const ch of text) {
    const f = ch.normalize("NFD").replace(/\p{M}/gu, "");
    for (let k = 0; k < f.length; k++) origin.push(i);
    folded += f;
    i += ch.length;
  }
  origin.push(text.length);
  return { folded, origin };
}

const bounded = (pattern: string, flags: string) => new RegExp(`(?<![\\p{L}\\p{N}])(?:${pattern})(?![\\p{L}\\p{N}])`, flags);

/**
 * Every way the child's name may be typed, accents ignored: the full name, each word
 * of it (two letters or more, not a particle), whatever the case, and its initials
 * ("J C", "J.C.", "j. c." — separated, any case — or "JC" in capitals only, so that
 * initials like "L. A." never hit ordinary words such as "la").
 */
function namePatterns(childName: string): RegExp[] {
  const words = fold(childName).folded.split(/[\s.-]+/).filter(Boolean);
  if (words.length === 0) return [];
  const patterns: RegExp[] = [];
  const isInitial = (w: string) => [...w].length === 1;
  if (!words.every(isInitial)) {
    patterns.push(bounded(words.map(escapeRegExp).join("[\\s.-]*") + (isInitial(words.at(-1)!) ? "\\.?" : ""), "giu"));
    for (const w of words) if (!isInitial(w) && !PARTICLES.has(w.toLowerCase())) patterns.push(bounded(escapeRegExp(w), "giu"));
  }
  const initials = words.filter((w) => !PARTICLES.has(w.toLowerCase())).map((w) => escapeRegExp([...w][0].toUpperCase()));
  if (initials.length >= 2) {
    patterns.push(bounded(initials.join("(?:\\s*[.-]\\s*|\\s+)") + "\\.?", "giu"));
    patterns.push(bounded(initials.join("") + "\\.?", "gu"));
  }
  return patterns;
}

/** Where the child's name appears in free text: [start, end) ranges, in order, never overlapping. */
export function childNameRanges(text: string, childName: string): [number, number][] {
  const { folded, origin } = fold(text);
  const found: [number, number][] = [];
  for (const pattern of namePatterns(childName)) {
    for (const m of folded.matchAll(pattern)) found.push([origin[m.index], origin[m.index + m[0].length]]);
  }
  // Longest first at each position, then drop matches inside an earlier one ("Léa" in "Léa Martin").
  found.sort((a, b) => a[0] - b[0] || b[1] - a[1]);
  const ranges: [number, number][] = [];
  for (const r of found) if (!ranges.length || r[0] >= ranges.at(-1)![1]) ranges.push(r);
  return ranges;
}

/** Swaps every form of the child's name for `replacement` (see childNameRanges). */
export function replaceChildName(text: string, childName: string, replacement: string): string {
  let out = "";
  let last = 0;
  for (const [start, end] of childNameRanges(text, childName)) {
    out += text.slice(last, start) + replacement;
    last = end;
  }
  return out + text.slice(last);
}

/** The forms of the child's name found in free text (as typed), for a warning before it is sent. */
export function findChildName(text: string, childName: string): string[] {
  return [...new Set(childNameRanges(text, childName).map(([s, e]) => text.slice(s, e)))];
}

export function substituteSections(sections: ReportSection[], childName: string, firstName: string): ReportSection[] {
  return sections.map((s) => ({ heading: substituteName(s.heading, childName, firstName), body: substituteName(s.body, childName, firstName) }));
}

export type Inline = { text: string; bold: boolean };
export type Block = { type: "paragraph"; inlines: Inline[] } | { type: "list"; items: Inline[][] };

/** "a **b** c" → runs with bold flags. Unmatched "**" stays as text. */
export function parseInline(text: string): Inline[] {
  const parts = text.split(/\*\*(.+?)\*\*/g);
  return parts.map((part, i) => ({ text: part, bold: i % 2 === 1 })).filter((p) => p.text !== "");
}

/** The light markdown used in section bodies: paragraphs and "- " lists. */
export function parseBody(body: string): Block[] {
  const blocks: Block[] = [];
  let paragraph: string[] = [];
  let list: Inline[][] | null = null;

  const flushParagraph = () => {
    if (paragraph.length) blocks.push({ type: "paragraph", inlines: parseInline(paragraph.join(" ")) });
    paragraph = [];
  };
  const flushList = () => {
    if (list) blocks.push({ type: "list", items: list });
    list = null;
  };

  for (const raw of body.split("\n")) {
    const line = raw.trim();
    const item = line.match(/^[-*•]\s+(.*)$/);
    if (item) {
      flushParagraph();
      (list ??= []).push(parseInline(item[1]));
    } else if (line === "") {
      flushParagraph();
      flushList();
    } else {
      flushList();
      paragraph.push(line);
    }
  }
  flushParagraph();
  flushList();
  return blocks;
}

/** Plain text for the clipboard: headings on their own line, "**" removed. */
export function sectionsToPlainText(sections: ReportSection[]): string {
  return sections
    .map((s) => {
      const body = parseBody(s.body)
        .map((b) =>
          b.type === "paragraph" ? b.inlines.map((i) => i.text).join("") : b.items.map((item) => `- ${item.map((i) => i.text).join("")}`).join("\n"),
        )
        .join("\n\n");
      return `${s.heading}\n\n${body}`;
    })
    .join("\n\n");
}
