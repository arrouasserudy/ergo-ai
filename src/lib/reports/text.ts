import type { ReportSection } from "@/db/schema";

/**
 * Client-side helpers for export. The first name typed at export is only ever
 * substituted here, in the browser, and never sent to the server.
 */

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Replaces the child's stored name ("Léa Martin", or initials "L. M." also typed as
 * "L.M." or "L. M") with the first name. An empty first name leaves the text unchanged.
 */
export function substituteName(text: string, childName: string, firstName: string): string {
  const replacement = firstName.trim();
  const words = childName.split(/[\s.-]+/).filter(Boolean);
  if (!replacement || words.length === 0) return text;
  // Words separated by optional dots/spaces/hyphens; initials may end with a dot.
  const isInitials = words.every((w) => [...w].length === 1);
  const pattern = words.map(escapeRegExp).join("[\\s.-]*") + (isInitials ? "\\.?" : "");
  // Not preceded or followed by a letter, so "L. M." inside a word is left alone.
  return text.replace(new RegExp(`(?<![\\p{L}])${pattern}(?![\\p{L}])`, "gu"), replacement);
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
