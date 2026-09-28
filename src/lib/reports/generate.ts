import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";
import type { ReportSection } from "@/db/schema";
import type { ChatProvider } from "@/lib/expert/providers/types";

/** Report drafts are short and structured: a mid-size model at low effort is enough. */
export const REPORT_MODEL = process.env.REPORT_MODEL ?? process.env.EXPERT_MODEL ?? "claude-sonnet-5";
export const REPORT_OPENAI_MODEL = process.env.REPORT_OPENAI_MODEL ?? process.env.EXPERT_OPENAI_MODEL ?? "gpt-5-mini";

/** Generations (one per recipient) per cabinet per day. */
export const DAILY_GENERATION_LIMIT = Number(process.env.REPORT_DAILY_LIMIT ?? 200);

const outputSchema = z.object({
  sections: z.array(z.object({ heading: z.string(), body: z.string() })),
});

export type GenerationErrorCode = "unavailable" | "refusal" | "generic";

export class GenerationError extends Error {
  constructor(public code: GenerationErrorCode, message?: string) {
    super(message ?? code);
  }
}

export type GenerationResult = { sections: ReportSection[]; model: string; usage: { input: number; output: number } };

/** A structured-output call: a system prompt, a user text and optionally a PDF the model reads. */
export type StructuredRequest<T extends z.ZodType> = {
  schema: T;
  /** Name of the output format (OpenAI). */
  name: string;
  system: string;
  prompt: string;
  pdf?: { data: Uint8Array; filename: string };
  models?: { anthropic: string; openai: string };
  effort?: "low" | "medium" | "high";
};

export type StructuredResult<T> = { output: T; model: string; usage: { input: number; output: number } };

let anthropic: Anthropic | null = null;
let openai: OpenAI | null = null;

const base64 = (data: Uint8Array) => Buffer.from(data).toString("base64");

async function withAnthropic<T extends z.ZodType>(req: StructuredRequest<T>): Promise<StructuredResult<z.infer<T>>> {
  anthropic ??= new Anthropic(); // reads ANTHROPIC_API_KEY
  const model = req.models?.anthropic ?? REPORT_MODEL;
  const content: Anthropic.ContentBlockParam[] = [];
  if (req.pdf) content.push({ type: "document", source: { type: "base64", media_type: "application/pdf", data: base64(req.pdf.data) } });
  content.push({ type: "text", text: req.prompt });
  try {
    const response = await anthropic.messages.parse({
      model,
      max_tokens: 16000,
      thinking: { type: "adaptive" },
      output_config: { effort: req.effort ?? "low", format: zodOutputFormat(req.schema) },
      system: req.system,
      messages: [{ role: "user", content }],
    });
    if (response.stop_reason === "refusal") throw new GenerationError("refusal");
    if (!response.parsed_output) throw new GenerationError("generic", `No parsed output (stop_reason: ${response.stop_reason})`);
    const u = response.usage;
    return {
      output: response.parsed_output as z.infer<T>,
      model,
      usage: { input: u.input_tokens + (u.cache_read_input_tokens ?? 0) + (u.cache_creation_input_tokens ?? 0), output: u.output_tokens },
    };
  } catch (err) {
    if (
      err instanceof Anthropic.AuthenticationError ||
      err instanceof Anthropic.RateLimitError ||
      err instanceof Anthropic.InternalServerError ||
      err instanceof Anthropic.APIConnectionError
    ) {
      throw new GenerationError("unavailable", err.message);
    }
    throw err;
  }
}

async function withOpenAI<T extends z.ZodType>(req: StructuredRequest<T>): Promise<StructuredResult<z.infer<T>>> {
  openai ??= new OpenAI(); // reads OPENAI_API_KEY
  const model = req.models?.openai ?? REPORT_OPENAI_MODEL;
  const content: OpenAI.ChatCompletionContentPart[] = [];
  if (req.pdf) content.push({ type: "file", file: { filename: req.pdf.filename, file_data: `data:application/pdf;base64,${base64(req.pdf.data)}` } });
  content.push({ type: "text", text: req.prompt });
  try {
    const completion = await openai.chat.completions.parse({
      model,
      messages: [
        { role: "system", content: req.system },
        { role: "user", content: req.pdf ? content : req.prompt },
      ],
      response_format: zodResponseFormat(req.schema, req.name),
    });
    const message = completion.choices[0]?.message;
    if (message?.refusal) throw new GenerationError("refusal");
    if (!message?.parsed) throw new GenerationError("generic", "No parsed output");
    return {
      output: message.parsed as z.infer<T>,
      model,
      usage: { input: completion.usage?.prompt_tokens ?? 0, output: completion.usage?.completion_tokens ?? 0 },
    };
  } catch (err) {
    if (
      err instanceof OpenAI.AuthenticationError ||
      err instanceof OpenAI.RateLimitError ||
      err instanceof OpenAI.InternalServerError ||
      err instanceof OpenAI.APIConnectionError
    ) {
      throw new GenerationError("unavailable", err.message);
    }
    throw err;
  }
}

/** One structured-output call to the chosen provider. */
export function generateStructured<T extends z.ZodType>(provider: ChatProvider, req: StructuredRequest<T>): Promise<StructuredResult<z.infer<T>>> {
  return provider === "openai" ? withOpenAI(req) : withAnthropic(req);
}

/** One structured draft. Sections with an empty heading and body are dropped. */
export async function generateSections(provider: ChatProvider, system: string, prompt: string): Promise<GenerationResult> {
  const { output, model, usage } = await generateStructured(provider, { schema: outputSchema, name: "report", system, prompt });
  const sections = output.sections.filter((s) => s.heading.trim() || s.body.trim());
  if (sections.length === 0) throw new GenerationError("generic", "Empty report");
  return { sections, model, usage };
}
