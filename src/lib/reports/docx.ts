import { AlignmentType, BorderStyle, Document, HeadingLevel, Packer, Paragraph, TextRun } from "docx";
import { parseBody, parseInline, type Inline } from "./text";
import type { ExportDocument } from "./export-document";

/**
 * Builds the .docx in the browser (this module is loaded with a dynamic import),
 * so the first name typed at export never leaves the therapist's computer.
 */
export async function buildDocx(doc: ExportDocument): Promise<Blob> {
  const rtl = doc.dir === "rtl";
  const run = (text: string, opts: { bold?: boolean; size?: number; color?: string } = {}) =>
    new TextRun({ text, bold: opts.bold, size: opts.size, color: opts.color, rightToLeft: rtl });
  const runs = (inlines: Inline[]) => inlines.map((i) => run(i.text, { bold: i.bold }));
  const para = (children: TextRun[], opts: { heading?: (typeof HeadingLevel)[keyof typeof HeadingLevel]; bullet?: boolean; after?: number } = {}) =>
    new Paragraph({
      children,
      heading: opts.heading,
      bullet: opts.bullet ? { level: 0 } : undefined,
      bidirectional: rtl,
      spacing: { after: opts.after ?? 120 },
    });

  const children: Paragraph[] = [];

  // Letterhead: cabinet name then its lines, small and grey, with a rule below.
  doc.letterhead.forEach((line, i) => {
    children.push(
      new Paragraph({
        children: [run(line, { bold: i === 0, size: i === 0 ? 22 : 18, color: i === 0 ? "1F2624" : "7C837F" })],
        bidirectional: rtl,
        spacing: { after: 0 },
        border: i === doc.letterhead.length - 1 ? { bottom: { style: BorderStyle.SINGLE, size: 6, color: "D6D2C6", space: 6 } } : undefined,
      }),
    );
  });

  children.push(para([run(doc.title)], { heading: HeadingLevel.TITLE, after: 80 }));
  children.push(para([run(doc.to, { color: "4A524F" })], { after: 80 }));
  for (const line of doc.meta) children.push(para([run(line)], { after: 40 }));
  children.push(para([], { after: 120 }));

  for (const section of doc.sections) {
    if (section.heading) children.push(para(parseInline(section.heading).map((i) => run(i.text)), { heading: HeadingLevel.HEADING_2 }));
    for (const block of parseBody(section.body)) {
      if (block.type === "paragraph") children.push(para(runs(block.inlines)));
      else for (const item of block.items) children.push(para(runs(item), { bullet: true, after: 60 }));
    }
  }

  children.push(para([], { after: 240 }));
  doc.signature.forEach((line, i) =>
    children.push(
      new Paragraph({
        children: [run(line, { bold: i === 0 })],
        alignment: AlignmentType.END,
        bidirectional: rtl,
        spacing: { after: 0 },
      }),
    ),
  );

  const document = new Document({
    styles: { default: { document: { run: { font: rtl ? "Arial" : "Calibri", size: 22 } } } },
    sections: [{ children }],
  });
  return Packer.toBlob(document);
}
