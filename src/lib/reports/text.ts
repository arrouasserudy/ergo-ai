import type { ReportSection } from "@/db/schema";

/**
 * Client-side helpers for export. The child's first name is only ever substituted
 * here, in the browser, and never sent to the server.
 */

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Replaces the child's initials ("L. M.", also typed as "L.M." or "L. M") with the
 * first name. An empty name leaves the text unchanged.
 */
export function substituteName(text: string, initials: string, firstName: string): string {
  const name = firstName.trim();
  const letters = initials.match(/\p{Lu}|[א-ת]/gu) ?? [];
  if (!name || letters.length === 0) return text;
  // Letters separated by optional dots/spaces; the final dot is optional.
  const pattern = letters.map(escapeRegExp).join("\\.?\\s?") + "\\.?";
  // Not preceded or followed by a letter, so "L. M." inside a word is left alone.
  return text.replace(new RegExp(`(?<![\\p{L}])${pattern}(?![\\p{L}])`, "gu"), name);
}

export function substituteSections(sections: ReportSection[], initials: string, firstName: string): ReportSection[] {
  return sections.map((s) => ({ heading: substituteName(s.heading, initials, firstName), body: substituteName(s.body, initials, firstName) }));
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
