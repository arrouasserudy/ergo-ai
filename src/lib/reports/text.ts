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

/** The full name, then each word of it ("Léa", "Martin"), but not lone initials, which would hit ordinary words. */
function nameForms(childName: string): string[] {
  return [childName, ...childName.split(/[\s.]+/).filter((w) => [...w].length > 1)];
}

/** Swaps every form of the child's name for `replacement`, whatever its case. */
export function replaceChildName(text: string, childName: string, replacement: string): string {
  return nameForms(childName).reduce((t, name) => {
    const pattern = namePattern(name, "giu");
    return pattern ? t.replace(pattern, replacement) : t;
  }, text);
}

/** The forms of the child's name found in free text (as typed), for a warning before it is sent. */
export function findChildName(text: string, childName: string): string[] {
  const found = new Set<string>();
  const covered: [number, number][] = [];
  for (const name of nameForms(childName)) {
    const pattern = namePattern(name, "giu");
    for (const match of pattern ? text.matchAll(pattern) : []) {
      const start = match.index;
      const end = start + match[0].length;
      // "Léa" inside an already found "Léa Martin" is the same mention.
      if (covered.some(([s, e]) => start >= s && end <= e)) continue;
      covered.push([start, end]);
      found.add(match[0]);
    }
  }
  return [...found];
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
