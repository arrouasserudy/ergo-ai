import "server-only";
import type { FormSourceKind } from "@/db/schema";
import type { ChatProvider } from "@/lib/expert/providers/types";
import { generateStructured, REPORT_MODEL, REPORT_OPENAI_MODEL } from "@/lib/reports/generate";
import { normalizeForm } from "./normalize";
import { FORM_SYSTEM_PROMPT, formUserPrompt } from "./prompt";
import { llmFormSchema, type FormLanguage, type FormSchema } from "./schema";

const FORMS_MODEL = process.env.FORMS_MODEL ?? REPORT_MODEL;
const FORMS_OPENAI_MODEL = process.env.FORMS_OPENAI_MODEL ?? REPORT_OPENAI_MODEL;

/** Conversions per cabinet per day. */
export const DAILY_CONVERSION_LIMIT = Number(process.env.FORMS_DAILY_LIMIT ?? 30);

/** A Word document is sent as HTML (keeps tables, which become grids); longer ones are cut. */
const MAX_HTML_CHARS = 150_000;

export function sourceKind(file: File): FormSourceKind | null {
  const name = file.name.toLowerCase();
  if (file.type === "application/pdf" || name.endsWith(".pdf")) return "pdf";
  if (file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || name.endsWith(".docx")) return "docx";
  return null;
}

async function docxHtml(bytes: Uint8Array): Promise<string> {
  const mammoth = await import("mammoth");
  const { value } = await mammoth.convertToHtml(
    { buffer: Buffer.from(bytes) },
    // Images (logos, scanned signatures) are dropped: only the text matters.
    { convertImage: mammoth.images.imgElement(async () => ({ src: "" })) },
  );
  const html = value.replace(/<img[^>]*>/g, "");
  if (!html.replace(/<[^>]+>/g, "").trim()) throw new Error("noText");
  return html.slice(0, MAX_HTML_CHARS);
}

export type Conversion = { schema: FormSchema; model: string; usage: { input: number; output: number } };

/**
 * Converts a blank questionnaire into a form. The PDF itself is sent (the model sees tick
 * boxes and grids); a Word file is sent as HTML. Throws GenerationError, or "noText" /
 * "noFields" when nothing usable comes out.
 */
export async function convertForm(
  provider: ChatProvider,
  file: { bytes: Uint8Array; filename: string; kind: FormSourceKind },
  fallbackLanguage: FormLanguage,
): Promise<Conversion> {
  const html = file.kind === "docx" ? await docxHtml(file.bytes) : undefined;
  const { output, model, usage } = await generateStructured(provider, {
    schema: llmFormSchema,
    name: "form",
    system: FORM_SYSTEM_PROMPT,
    prompt: formUserPrompt({ filename: file.filename, html, fallbackLanguage }),
    pdf: file.kind === "pdf" ? { data: file.bytes, filename: file.filename } : undefined,
    models: { anthropic: FORMS_MODEL, openai: FORMS_OPENAI_MODEL },
    effort: "medium",
  });
  const fallbackTitle = file.filename.replace(/\.(pdf|docx)$/i, "");
  return { schema: normalizeForm(output, fallbackTitle, fallbackLanguage), model, usage };
}
