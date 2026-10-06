import "server-only";
import { createSdkMcpServer, query, tool } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";
import { claudeCodeOptions, UNAVAILABLE_ERRORS } from "@/lib/claude-code";
import { partsFromMarkers, type CitablePassage } from "../answer";
import { formatPassages, toCitable } from "../passages";
import { SEARCH_BUDGET_SPENT, searchBudget } from "../search-budget";
import { runSearch, SEARCH_QUERY_DESCRIPTION, SEARCH_TOOL_DESCRIPTION, SEARCH_UNAVAILABLE } from "../search-tool";
import { expertSystemPrompt } from "../system-prompt";
import { transcriptPrompt } from "../transcript";
import { ANTHROPIC_MODEL } from "./anthropic";
import { ProviderUnavailableError, type RunArgs, type RunResult, type StoredMessage } from "./types";

const MAX_TURNS = 6;

/**
 * Claude through a Claude.ai subscription (Agent SDK). Same storage and citation
 * scheme as OpenAI: messages are stored as {role, content: string}, tool turns keep
 * their passages, and `[library:123]` markers are resolved against retrieved passages.
 */
export async function runClaudeCode({ history, prompt, locale, accountId, send }: RunArgs): Promise<RunResult> {
  // Passages retrieved earlier in the conversation can still be cited.
  const known = new Map<string, CitablePassage>();
  for (const m of history) for (const p of (m.content as { passages?: CitablePassage[] }).passages ?? []) known.set(p.id, p);

  const newMessages: StoredMessage[] = [{ role: "user", content: { role: "user", content: prompt } }];
  const budget = searchBudget();

  const library = createSdkMcpServer({
    name: "library",
    tools: [
      tool("search_literature", SEARCH_TOOL_DESCRIPTION, { query: z.string().min(3).max(300).describe(SEARCH_QUERY_DESCRIPTION) }, async ({ query }) => {
        let content = SEARCH_BUDGET_SPENT;
        let passages: CitablePassage[] = [];
        if (budget.take()) {
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
        newMessages.push({ role: "tool", content: { role: "tool", content, passages } });
        return { content: [{ type: "text", text: content }] };
      }),
    ],
  });

  const usage = { input: 0, output: 0 };
  let refused = false;
  let text = "";
  const flush = () => {
    newMessages.push({ role: "assistant", content: { role: "assistant", content: text } });
    if (text) send({ type: "message", parts: partsFromMarkers(text, known) });
    text = "";
  };

  for await (const msg of query({
    prompt: transcriptPrompt(history, prompt),
    options: {
      ...claudeCodeOptions(ANTHROPIC_MODEL, expertSystemPrompt(locale, "markers")),
      effort: "medium",
      mcpServers: { library },
      allowedTools: ["mcp__library__search_literature"],
      maxTurns: MAX_TURNS,
      includePartialMessages: true,
    },
  })) {
    if (msg.type === "stream_event" && msg.parent_tool_use_id === null) {
      const event = msg.event;
      if (event.type === "message_start") text = "";
      else if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        text += event.delta.text;
        send({ type: "text", text: event.delta.text });
      } else if (event.type === "message_delta" && event.delta.stop_reason === "refusal") refused = true;
      else if (event.type === "message_stop") flush();
    } else if (msg.type === "assistant" && msg.error && UNAVAILABLE_ERRORS.has(msg.error)) {
      throw new ProviderUnavailableError(msg.error);
    } else if (msg.type === "system" && msg.subtype === "model_refusal_no_fallback") {
      refused = true;
    } else if (msg.type === "result") {
      const u = msg.usage;
      usage.input = u.input_tokens + (u.cache_read_input_tokens ?? 0) + (u.cache_creation_input_tokens ?? 0);
      usage.output = u.output_tokens;
      if (msg.subtype === "success" && msg.is_error) throw new ProviderUnavailableError(msg.result);
    }
  }
  if (text) flush();
  return { newMessages, usage, refused };
}
