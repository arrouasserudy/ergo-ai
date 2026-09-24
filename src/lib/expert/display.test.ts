import { describe, expect, it } from "vitest";
import { partsFromAnthropic, partsFromMarkers, stripMarkers, type CitablePassage } from "./answer";
import { buildAnswer, toDisplayTurns } from "./display";

const cite = (source: string, cited_text: string) => ({
  type: "search_result_location" as const,
  source,
  title: `Title of ${source}`,
  cited_text,
  search_result_index: 0,
  start_block_index: 0,
  end_block_index: 1,
});
const text = (t: string, citations: ReturnType<typeof cite>[] | null = null) => ({ type: "text" as const, text: t, citations });

describe("buildAnswer (Anthropic citations)", () => {
  it("numbers sources in order of first citation and marks cited text", () => {
    const answer = buildAnswer(
      partsFromAnthropic([
        text("Weighted vests show mixed results"),
        text(".", null),
        text(" Fine motor programmes help", [cite("https://a.org/1#library:1", "passage A"), cite("https://b.org/2#library:9", "passage B")]),
        text(" and again", [cite("https://a.org/1#library:1", "passage A2")]),
      ]),
    );
    expect(answer.markdown).toBe("Weighted vests show mixed results. Fine motor programmes help [1](#cite-1) [2](#cite-2) and again [1](#cite-1)");
    expect(answer.sources).toEqual([
      { n: 1, title: "Title of https://a.org/1#library:1", url: "https://a.org/1", passages: ["passage A", "passage A2"] },
      { n: 2, title: "Title of https://b.org/2#library:9", url: "https://b.org/2", passages: ["passage B"] },
    ]);
  });

  it("splits out the limits paragraph", () => {
    const answer = buildAnswer(partsFromAnthropic([text("Try a quiet corner.\n\n[LIMITS] I don't see the child.")]));
    expect(answer).toMatchObject({ markdown: "Try a quiet corner.", limits: "I don't see the child." });
  });

  it("has no limits box when the marker is missing", () => {
    expect(buildAnswer(partsFromAnthropic([text("Hello")])).limits).toBeNull();
  });
});

const passage = (id: string): CitablePassage => ({ id, source: `https://x.org/${id}#${id}`, title: `T ${id}`, text: `text ${id}` });

describe("partsFromMarkers (OpenAI citations)", () => {
  const known = new Map([["library:1", passage("library:1")], ["upload:7", passage("upload:7")]]);

  it("turns markers into citations and removes them from the text", () => {
    const answer = buildAnswer(partsFromMarkers("Vests help [library:1]. Pads too [library:1, upload:7].", known));
    expect(answer.markdown).toBe("Vests help [1](#cite-1). Pads too [1](#cite-1) [2](#cite-2).");
    expect(answer.sources.map((s) => s.title)).toEqual(["T library:1", "T upload:7"]);
  });

  it("drops ids that were never retrieved (no invented sources)", () => {
    const answer = buildAnswer(partsFromMarkers("A claim [library:999].", known));
    expect(answer.markdown).toBe("A claim.");
    expect(answer.sources).toEqual([]);
  });

  it("hides markers while streaming, including a half-written one", () => {
    expect(stripMarkers("Vests help [library:1]. More [libr")).toBe("Vests help . More [libr");
    expect(stripMarkers("Pads [upload:")).toBe("Pads ");
  });
});

describe("toDisplayTurns", () => {
  it("Anthropic: hides tool turns and child context, merges one answer's assistant turns", () => {
    const turns = toDisplayTurns([
      { role: "user", isPrompt: true, content: "Context about the child we are discussing:\n- Age: 7 years\n\nHe refuses to write." },
      { role: "assistant", isPrompt: false, content: [{ type: "thinking", thinking: "" }, { type: "tool_use", id: "t", name: "search_literature", input: {} }] },
      { role: "user", isPrompt: false, content: [{ type: "tool_result", tool_use_id: "t", content: [] }] },
      { role: "assistant", isPrompt: false, content: [text("First part")] },
      { role: "assistant", isPrompt: false, content: [text("Second part")] },
      { role: "user", isPrompt: true, content: "Thanks" },
    ]);
    expect(turns).toEqual([
      { role: "user", text: "He refuses to write." },
      { role: "assistant", parts: [{ text: "First part", citations: [] }, { text: "Second part", citations: [] }] },
      { role: "user", text: "Thanks" },
    ]);
  });

  it("OpenAI: resolves markers against passages from earlier tool results", () => {
    const turns = toDisplayTurns(
      [
        { role: "user", isPrompt: true, content: { role: "user", content: "Weighted vests?" } },
        { role: "assistant", isPrompt: false, content: { role: "assistant", content: null, tool_calls: [{ id: "c1" }] } },
        { role: "tool", isPrompt: false, content: { role: "tool", tool_call_id: "c1", content: "…", passages: [passage("library:1")] } },
        { role: "assistant", isPrompt: false, content: { role: "assistant", content: "Mixed evidence [library:1]." } },
      ],
      "openai",
    );
    expect(turns[0]).toEqual({ role: "user", text: "Weighted vests?" });
    const answer = turns[1];
    expect(answer.role).toBe("assistant");
    if (answer.role === "assistant") expect(buildAnswer(answer.parts).sources.map((s) => s.title)).toEqual(["T library:1"]);
  });
});
