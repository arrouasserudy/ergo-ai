import OpenAI from "openai";
import { describe, expect, it, vi } from "vitest";
import type { ChatEvent } from "../events";

vi.mock("server-only", () => ({}));
vi.mock("../search-tool", () => ({
  SEARCH_TOOL_DESCRIPTION: "search",
  SEARCH_QUERY_DESCRIPTION: "query",
  SEARCH_UNAVAILABLE: "unavailable",
  citationTitle: (p: { title: string }) => `Doe (2024). ${p.title}`,
  runSearch: vi.fn(async () => [
    { id: "library:1", title: "Weighted vests", authors: "Doe", year: 2024, url: "https://x.org/1", license: "CC BY", section: "Discussion", text: "Mixed effects on attention." },
  ]),
}));

const { runOpenAI } = await import("./openai");
const { runSearch } = await import("../search-tool");

/** Server-sent events body, as the Chat Completions streaming API returns it. */
function sse(chunks: object[]) {
  const body = chunks.map((c) => `data: ${JSON.stringify(c)}\n\n`).join("") + "data: [DONE]\n\n";
  return new Response(body, { headers: { "content-type": "text/event-stream" } });
}
const chunk = (delta: object, finish: string | null = null) => ({ id: "c", object: "chat.completion.chunk", created: 0, model: "m", choices: [{ index: 0, delta, finish_reason: finish }] });
const usage = (p: number, c: number) => ({ id: "c", object: "chat.completion.chunk", created: 0, model: "m", choices: [], usage: { prompt_tokens: p, completion_tokens: c, total_tokens: p + c } });

describe("runOpenAI", () => {
  it("reassembles streamed tool calls, searches, and resolves citation markers", async () => {
    const requests: { messages: { role: string; passages?: unknown }[] }[] = [];
    const responses = [
      // Turn 1: a tool call whose id, name and arguments arrive in pieces.
      sse([
        chunk({ role: "assistant", tool_calls: [{ index: 0, id: "call_1", type: "function", function: { name: "search_", arguments: "" } }] }),
        chunk({ tool_calls: [{ index: 0, function: { name: "literature", arguments: '{"query":"weighted ' } }] }),
        chunk({ tool_calls: [{ index: 0, function: { arguments: 'vest"}' } }] }, "tool_calls"),
        usage(100, 10),
      ]),
      // Turn 2: the answer, citing the retrieved passage and an invented one.
      sse([chunk({ content: "Evidence is mixed [library:1]." }), chunk({ content: " See also [library:99]." }, "stop"), usage(200, 20)]),
    ];
    const api = new OpenAI({
      apiKey: "test",
      fetch: async (_url, init) => {
        requests.push(JSON.parse(String(init?.body)));
        return responses.shift()!;
      },
    });

    const events: ChatEvent[] = [];
    const result = await runOpenAI({ history: [], prompt: "Weighted vests?", locale: "fr", accountId: "acc", send: (e) => events.push(e) }, api);

    expect(events).toContainEqual({ type: "search", query: "weighted vest" });
    const message = events.find((e) => e.type === "message");
    expect(message).toEqual({
      type: "message",
      parts: [
        { text: "Evidence is mixed", citations: [{ source: "https://x.org/1#library:1", title: "Doe (2024). Weighted vests", citedText: "Mixed effects on attention." }] },
        { text: ". See also", citations: [] }, // the invented id is dropped
        { text: ".", citations: [] },
      ],
    });
    expect(result.newMessages.map((m) => m.role)).toEqual(["user", "assistant", "tool", "assistant"]);
    expect(result.newMessages[1].content).toMatchObject({ tool_calls: [{ id: "call_1", function: { name: "search_literature", arguments: '{"query":"weighted vest"}' } }] });
    expect(result.newMessages[2].content).toMatchObject({ role: "tool", tool_call_id: "call_1", passages: [{ id: "library:1" }] });
    expect(result.usage).toEqual({ input: 300, output: 30 });
    // Stored passages are never sent back to the API.
    expect(requests[1].messages.find((m) => m.role === "tool")).not.toHaveProperty("passages");
  });
  it("caps searches per answer and still answers every tool call", async () => {
    vi.mocked(runSearch).mockClear();
    const requests: { tool_choice?: string; messages: { role: string; tool_call_id?: string; content?: string }[] }[] = [];
    const call = (i: number) => ({ index: i, id: `call_${i}`, type: "function", function: { name: "search_literature", arguments: `{"query":"q${i}"}` } });
    const responses = [
      sse([chunk({ role: "assistant", tool_calls: [0, 1, 2, 3].map(call) }, "tool_calls"), usage(1, 1)]),
      sse([chunk({ content: "Answer." }, "stop"), usage(1, 1)]),
    ];
    const api = new OpenAI({
      apiKey: "test",
      fetch: async (_url, init) => {
        requests.push(JSON.parse(String(init?.body)));
        return responses.shift()!;
      },
    });

    const events: ChatEvent[] = [];
    await runOpenAI({ history: [], prompt: "Q?", locale: "fr", accountId: "acc", send: (e) => events.push(e) }, api);

    expect(runSearch).toHaveBeenCalledTimes(3);
    expect(events.filter((e) => e.type === "search")).toHaveLength(3);
    const tools = requests[1].messages.filter((m) => m.role === "tool");
    expect(tools.map((m) => m.tool_call_id)).toEqual(["call_0", "call_1", "call_2", "call_3"]);
    expect(tools[3].content).toMatch(/budget/);
    expect(requests[0].tool_choice).toBeUndefined();
    expect(requests[1].tool_choice).toBe("none");
  });
});
