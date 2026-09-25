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

let anthropic: Anthropic | null = null;
let openai: OpenAI | null = null;

async function withAnthropic(system: string, prompt: string): Promise<GenerationResult> {
  anthropic ??= new Anthropic(); // reads ANTHROPIC_API_KEY
  try {
    const response = await anthropic.messages.parse({
      model: REPORT_MODEL,
      max_tokens: 16000,
      thinking: { type: "adaptive" },
      output_config: { effort: "low", format: zodOutputFormat(outputSchema) },
      system,
      messages: [{ role: "user", content: prompt }],
    });
    if (response.stop_reason === "refusal") throw new GenerationError("refusal");
    if (!response.parsed_output) throw new GenerationError("generic", `No parsed output (stop_reason: ${response.stop_reason})`);
    const u = response.usage;
    return {
      sections: response.parsed_output.sections,
      model: REPORT_MODEL,
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

async function withOpenAI(system: string, prompt: string): Promise<GenerationResult> {
  openai ??= new OpenAI(); // reads OPENAI_API_KEY
  try {
    const completion = await openai.chat.completions.parse({
      model: REPORT_OPENAI_MODEL,
      messages: [
        { role: "system", content: system },
        { role: "user", content: prompt },
      ],
      response_format: zodResponseFormat(outputSchema, "report"),
    });
    const message = completion.choices[0]?.message;
    if (message?.refusal) throw new GenerationError("refusal");
    if (!message?.parsed) throw new GenerationError("generic", "No parsed output");
    return {
      sections: message.parsed.sections,
      model: REPORT_OPENAI_MODEL,
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

/** One structured draft. Sections with an empty heading and body are dropped. */
export async function generateSections(provider: ChatProvider, system: string, prompt: string): Promise<GenerationResult> {
  const result = provider === "openai" ? await withOpenAI(system, prompt) : await withAnthropic(system, prompt);
  const sections = result.sections.filter((s) => s.heading.trim() || s.body.trim());
  if (sections.length === 0) throw new GenerationError("generic", "Empty report");
  return { ...result, sections };
}
