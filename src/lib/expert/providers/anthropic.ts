import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type { BetaMessageParam } from "@anthropic-ai/sdk/resources/beta";
import { partsFromAnthropic } from "../answer";
import { searchLiteratureTool } from "../search-tool";
import { expertSystemPrompt } from "../system-prompt";
import { ProviderUnavailableError, type RunArgs, type RunResult, type StoredMessage } from "./types";

/** Chosen for cost; see the module plan. */
export const ANTHROPIC_MODEL = process.env.EXPERT_MODEL ?? "claude-opus-5-5";

let client: Anthropic | null = null;

/** Claude with native search_result citations; messages are stored as API content blocks. */
export async function runAnthropic({ history, prompt, locale, accountId, send }: RunArgs): Promise<RunResult> {
  client ??= new Anthropic(); // reads ANTHROPIC_API_KEY
  const messages: BetaMessageParam[] = [
    ...history.map((m) => ({ role: m.role as "user" | "assistant", content: m.content as BetaMessageParam["content"] })),
    { role: "user", content: prompt },
  ];

  try {
    const runner = client.beta.messages.toolRunner({
      model: ANTHROPIC_MODEL,
      max_tokens: 16000,
      thinking: { type: "adaptive" },
      output_config: { effort: "medium" },
      cache_control: { type: "ephemeral" }, // caches system prompt + history prefix
      system: expertSystemPrompt(locale),
      tools: [searchLiteratureTool(accountId, (query) => send({ type: "search", query }))],
      messages,
      max_iterations: 6,
      stream: true,
    });

    const usage = { input: 0, output: 0 };
    let refused = false;
    for await (const messageStream of runner) {
      for await (const event of messageStream) {
        if (event.type === "content_block_delta" && event.delta.type === "text_delta") send({ type: "text", text: event.delta.text });
      }
      const final = await messageStream.finalMessage();
      const u = final.usage;
      usage.input += u.input_tokens + (u.cache_read_input_tokens ?? 0) + (u.cache_creation_input_tokens ?? 0);
      usage.output += u.output_tokens;
      const parts = partsFromAnthropic(final.content);
      if (parts.length) send({ type: "message", parts });
      if (final.stop_reason === "refusal") {
        refused = true;
        break;
      }
      // A truncated tool call must not run.
      if (final.stop_reason === "max_tokens" && final.content.some((b) => b.type === "tool_use")) break;
    }

    // The runner appended every assistant turn and tool result to its params.
    // (This chat never adds mid-conversation system messages.)
    const newMessages: StoredMessage[] = runner.params.messages
      .slice(history.length)
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));
    return { newMessages, usage, refused };
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError || err instanceof Anthropic.RateLimitError || err instanceof Anthropic.InternalServerError) {
      throw new ProviderUnavailableError(err.message);
    }
    throw err;
  }
}
