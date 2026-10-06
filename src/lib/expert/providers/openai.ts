import "server-only";
import OpenAI from "openai";
import type {
  ChatCompletionAssistantMessageParam,
  ChatCompletionFunctionTool,
  ChatCompletionMessageParam,
} from "openai/resources/chat/completions";
import { partsFromMarkers, type CitablePassage } from "../answer";
import { formatPassages, toCitable } from "../passages";
import { SEARCH_BUDGET_SPENT, searchBudget } from "../search-budget";
import { runSearch, SEARCH_QUERY_DESCRIPTION, SEARCH_TOOL_DESCRIPTION, SEARCH_UNAVAILABLE } from "../search-tool";
import { expertSystemPrompt } from "../system-prompt";
import { ProviderUnavailableError, type RunArgs, type RunResult, type StoredMessage } from "./types";

/** Any chat model with function calling; set EXPERT_OPENAI_MODEL to change it. */
export const OPENAI_MODEL = process.env.EXPERT_OPENAI_MODEL ?? "gpt-5-mini";

const MAX_STEPS = 6;

const searchTool: ChatCompletionFunctionTool = {
  type: "function",
  function: {
    name: "search_literature",
    description: SEARCH_TOOL_DESCRIPTION,
    strict: true,
    parameters: {
      type: "object",
      properties: { query: { type: "string", description: SEARCH_QUERY_DESCRIPTION } },
      required: ["query"],
      additionalProperties: false,
    },
  },
};

/**
 * Stored tool messages carry the retrieved passages (to resolve citation markers
 * later); that extra field must not be sent back to the API.
 */
type StoredToolMessage = { role: "tool"; tool_call_id: string; content: string; passages: CitablePassage[] };

function toApiMessage(m: StoredMessage): ChatCompletionMessageParam {
  const msg = m.content as ChatCompletionMessageParam & { passages?: unknown };
  if (msg.role === "tool") return { role: "tool", tool_call_id: msg.tool_call_id, content: msg.content };
  return msg;
}

let client: OpenAI | null = null;

/**
 * OpenAI Chat Completions with a function tool and a hand-written streaming loop.
 * Citations use `[library:123]` markers, resolved only against passages this
 * conversation actually retrieved. Messages are stored in OpenAI's format.
 */
export async function runOpenAI({ history, prompt, locale, accountId, send }: RunArgs, api?: OpenAI): Promise<RunResult> {
  const openai = api ?? (client ??= new OpenAI()); // reads OPENAI_API_KEY

  // Passages retrieved earlier in the conversation can still be cited.
  const known = new Map<string, CitablePassage>();
  for (const m of history) for (const p of (m.content as Partial<StoredToolMessage>).passages ?? []) known.set(p.id, p);

  const userMessage: ChatCompletionMessageParam = { role: "user", content: prompt };
  const newMessages: StoredMessage[] = [{ role: "user", content: userMessage }];
  const messages: ChatCompletionMessageParam[] = [
    { role: "system", content: expertSystemPrompt(locale, "markers") },
    ...history.map(toApiMessage),
    userMessage,
  ];

  const usage = { input: 0, output: 0 };
  let refused = false;
  const budget = searchBudget();
  try {
    for (let step = 0; step < MAX_STEPS; step++) {
      const stream = await openai.chat.completions.create({
        model: OPENAI_MODEL,
        messages,
        tools: [searchTool],
        // Budget spent: the model must answer (tools stay listed, so the prefix stays cached).
        ...(budget.spent ? { tool_choice: "none" as const } : {}),
        stream: true,
        stream_options: { include_usage: true },
        max_completion_tokens: 16000,
      });

      let text = "";
      let refusal = "";
      let finish: string | null = null;
      const calls: { id: string; name: string; args: string }[] = [];
      for await (const chunk of stream) {
        if (chunk.usage) {
          usage.input += chunk.usage.prompt_tokens;
          usage.output += chunk.usage.completion_tokens;
        }
        const choice = chunk.choices[0];
        if (!choice) continue;
        const delta = choice.delta;
        if (delta.content) {
          text += delta.content;
          send({ type: "text", text: delta.content });
        }
        if (delta.refusal) refusal += delta.refusal;
        for (const tc of delta.tool_calls ?? []) {
          const call = (calls[tc.index] ??= { id: "", name: "", args: "" });
          if (tc.id) call.id = tc.id;
          if (tc.function?.name) call.name += tc.function.name;
          if (tc.function?.arguments) call.args += tc.function.arguments;
        }
        if (choice.finish_reason) finish = choice.finish_reason;
      }

      const assistant: ChatCompletionAssistantMessageParam = {
        role: "assistant",
        content: text || null,
        ...(calls.length ? { tool_calls: calls.map((c) => ({ id: c.id, type: "function" as const, function: { name: c.name, arguments: c.args } })) } : {}),
      };
      messages.push(assistant);
      newMessages.push({ role: "assistant", content: assistant });
      if (text) send({ type: "message", parts: partsFromMarkers(text, known) });

      if (refusal) {
        refused = true;
        break;
      }
      // Truncated output: a partial tool call must not run.
      if (finish === "length" || calls.length === 0) break;

      for (const call of calls) {
        let query = "";
        try {
          query = String(JSON.parse(call.args).query ?? "");
        } catch {
          // invalid arguments: answered with an error result below
        }
        let content = "Invalid arguments: expected {\"query\": string}.";
        let passages: CitablePassage[] = [];
        // Every tool call needs its tool message, even beyond the budget.
        if (query && !budget.take()) content = SEARCH_BUDGET_SPENT;
        else if (query) {
          send({ type: "search", query });
          try {
            const found = await runSearch(accountId, query);
            if (found) {
              passages = found.map(toCitable);
              for (const p of passages) known.set(p.id, p);
              content = formatPassages(found);
            } else content = SEARCH_UNAVAILABLE;
          } catch (err) {
            console.error("[expert] search failed", err);
            content = SEARCH_UNAVAILABLE;
          }
        }
        const stored: StoredToolMessage = { role: "tool", tool_call_id: call.id, content, passages };
        messages.push({ role: "tool", tool_call_id: call.id, content });
        newMessages.push({ role: "tool", content: stored });
      }
    }
    return { newMessages, usage, refused };
  } catch (err) {
    if (err instanceof OpenAI.AuthenticationError || err instanceof OpenAI.RateLimitError || err instanceof OpenAI.InternalServerError) {
      throw new ProviderUnavailableError(err.message);
    }
    throw err;
  }
}
