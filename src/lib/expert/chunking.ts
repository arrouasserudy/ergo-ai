/**
 * Splits documents into passages for retrieval. Shared by the corpus builder
 * (PubMed Central articles) and cabinet uploads (PDFs).
 *
 * Passages stay inside one section, target ~500 tokens (~2,000 characters of
 * English) and never exceed ~700 tokens. Each keeps its section heading, which is
 * prefixed ("Title · Section") to the text that gets embedded and indexed: a cheap
 * form of contextual retrieval.
 */

export type Paragraph = { section: string; text: string; page?: number };
export type Chunk = { section: string; text: string; ordinal: number; page?: number };

const TARGET_CHARS = 2000;
const MAX_CHARS = 2800;

/** Splits an overlong paragraph at sentence boundaries. */
function splitLong(text: string): string[] {
  if (text.length <= MAX_CHARS) return [text];
  const sentences = text.match(/[^.!?]+[.!?]+["')\]]*\s*|[^.!?]+$/g) ?? [text];
  const parts: string[] = [];
  let current = "";
  for (const s of sentences) {
    if (current && current.length + s.length > TARGET_CHARS) {
      parts.push(current.trim());
      current = "";
    }
    // A single sentence longer than the max is hard-cut.
    if (s.length > MAX_CHARS) {
      for (let i = 0; i < s.length; i += TARGET_CHARS) parts.push(s.slice(i, i + TARGET_CHARS).trim());
      continue;
    }
    current += s;
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
}

export function chunkParagraphs(paragraphs: Paragraph[]): Chunk[] {
  const chunks: Chunk[] = [];
  let buffer: string[] = [];
  let section = "";
  let page: number | undefined;

  const flush = () => {
    if (buffer.length) chunks.push({ section, text: buffer.join("\n\n"), ordinal: chunks.length, page });
    buffer = [];
  };

  for (const p of paragraphs) {
    const text = p.text.replace(/\s+/g, " ").trim();
    if (!text) continue;
    if (p.section !== section) {
      flush();
      section = p.section;
      page = p.page;
    }
    for (const piece of splitLong(text)) {
      const size = buffer.reduce((n, b) => n + b.length, 0);
      if (buffer.length && size + piece.length > TARGET_CHARS) {
        flush();
        page = p.page;
      }
      if (!buffer.length) page = p.page;
      buffer.push(piece);
    }
  }
  flush();
  return chunks;
}

/** The text that is embedded and full-text indexed for a passage. */
export function indexedText(title: string, chunk: Pick<Chunk, "section" | "text">): string {
  return `${title} · ${chunk.section}\n\n${chunk.text}`;
}
