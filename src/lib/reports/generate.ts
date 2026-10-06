import "server-only";
import { query, type SDKUserMessage } from "@anthropic-ai/claude-agent-sdk";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";
import { REPORT_INSIGHT_KINDS, type ReportSection } from "@/db/schema";
import { claudeCodeOptions, UNAVAILABLE_ERRORS } from "@/lib/claude-code";
import type { ChatProvider } from "@/lib/expert/providers/types";
import type { RawInsight } from "./insights";

/** Drafts carry clinical reasoning and must read like a senior OT (Hebrew first): the strongest model, medium effort. */
export const REPORT_MODEL = process.env.REPORT_MODEL ?? process.env.EXPERT_MODEL ?? "claude-opus-5-5";
export const REPORT_OPENAI_MODEL = process.env.REPORT_OPENAI_MODEL ?? process.env.EXPERT_OPENAI_MODEL ?? "gpt-5-mini";

/** Generations (one per recipient) per cabinet per day. */
export const DAILY_GENERATION_LIMIT = Number(process.env.REPORT_DAILY_LIMIT ?? 200);

const sectionsSchema = z.array(z.object({ heading: z.string(), body: z.string() }));

const draftSchema = z.object({
  sections: sectionsSchema,
  insights: z.array(z.object({ kind: z.enum(REPORT_INSIGHT_KINDS), text: z.string(), basis: z.string() })),
});

const rewriteSchema = z.object({ sections: sectionsSchema });

/** Effort of report calls (draft and rewrite). */
const REPORT_EFFORT = "medium";

export type GenerationErrorCode = "unavailable" | "refusal" | "generic";

export class GenerationError extends Error {
  constructor(public code: GenerationErrorCode, message?: string) {
    super(message ?? code);
  }
}

export type GenerationResult = { sections: ReportSection[]; model: string; usage: { input: number; output: number } };
export type DraftResult = GenerationResult & { insights: RawInsight[] };

/** A structured-output call: a system prompt, a user text and optionally a PDF the model reads. */
export type StructuredRequest<T extends z.ZodType> = {
  schema: T;
  /** Name of the output format (OpenAI). */
  name: string;
  system: string;
  prompt: string;
  pdf?: { data: Uint8Array; filename: string };
  /** Claude model (API key or subscription), OpenAI model. */
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

/** JSON Schema for the CLI, whose validator rejects the draft 2020-12 `$schema` URI Zod adds. */
function jsonSchema(schema: z.ZodType): Record<string, unknown> {
  const json = z.toJSONSchema(schema) as Record<string, unknown>;
  delete json.$schema;
  return json;
}

/** Same call through a Claude.ai subscription (Agent SDK, structured output, no tools). */
async function withClaudeCode<T extends z.ZodType>(req: StructuredRequest<T>): Promise<StructuredResult<z.infer<T>>> {
  const model = req.models?.anthropic ?? REPORT_MODEL;
  const content: Anthropic.ContentBlockParam[] = [];
  if (req.pdf) content.push({ type: "document", source: { type: "base64", media_type: "application/pdf", data: base64(req.pdf.data) } });
  content.push({ type: "text", text: req.prompt });
  async function* prompt(): AsyncIterable<SDKUserMessage> {
    yield { type: "user", parent_tool_use_id: null, message: { role: "user", content } };
  }

  let result: { output: unknown; usage: { input: number; output: number } } | null = null;
  try {
    for await (const msg of query({
      prompt: prompt(),
      options: {
        ...claudeCodeOptions(model, req.system),
        effort: req.effort ?? "low",
        maxTurns: 3,
        outputFormat: { type: "json_schema", schema: jsonSchema(req.schema) },
      },
    })) {
      if (msg.type === "assistant" && msg.error && UNAVAILABLE_ERRORS.has(msg.error)) throw new GenerationError("unavailable", msg.error);
      if (msg.type === "system" && msg.subtype === "model_refusal_no_fallback") throw new GenerationError("refusal");
      if (msg.type !== "result") continue;
      if (msg.subtype !== "success") throw new GenerationError("generic", `${msg.subtype}: ${msg.errors.join("; ")}`);
      if (msg.is_error) throw new GenerationError("unavailable", msg.result);
      if (msg.stop_reason === "refusal") throw new GenerationError("refusal");
      const u = msg.usage;
      result = {
        output: msg.structured_output,
        usage: { input: u.input_tokens + (u.cache_read_input_tokens ?? 0) + (u.cache_creation_input_tokens ?? 0), output: u.output_tokens },
      };
    }
  } catch (err) {
    if (err instanceof GenerationError) throw err;
    // The CLI failed to start or crashed (missing binary, bad token…).
    throw new GenerationError("unavailable", err instanceof Error ? err.message : String(err));
  }
  const parsed = req.schema.safeParse(result?.output);
  if (!result || !parsed.success) throw new GenerationError("generic", "No valid structured output");
  return { output: parsed.data, model, usage: result.usage };
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
  if (provider === "openai") return withOpenAI(req);
  if (provider === "claude-code") return withClaudeCode(req);
  return withAnthropic(req);
}

const nonEmpty = (sections: ReportSection[]) => {
  const kept = sections.filter((s) => s.heading.trim() || s.body.trim());
  if (kept.length === 0) throw new GenerationError("generic", "Empty report");
  return kept;
};

/** One structured draft: the report sections and, apart, the model's clinical ideas. Empty sections are dropped. */
export async function generateDraft(provider: ChatProvider, system: string, prompt: string): Promise<DraftResult> {
  const { output, model, usage } = await generateStructured(provider, { schema: draftSchema, name: "report", system, prompt, effort: REPORT_EFFORT });
  return { sections: nonEmpty(output.sections), insights: output.insights, model, usage };
}

/** The report rewritten with the validated ideas. */
export async function generateRewrite(provider: ChatProvider, system: string, prompt: string): Promise<GenerationResult> {
  const { output, model, usage } = await generateStructured(provider, { schema: rewriteSchema, name: "report", system, prompt, effort: REPORT_EFFORT });
  return { sections: nonEmpty(output.sections), model, usage };
}
