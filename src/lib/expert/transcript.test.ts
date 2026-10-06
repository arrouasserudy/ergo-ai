import { describe, expect, it } from "vitest";
import { transcriptPrompt } from "./transcript";

describe("transcriptPrompt", () => {
  it("returns the prompt alone for a new conversation", () => {
    expect(transcriptPrompt([], "Hello")).toBe("Hello");
  });

  it("replays earlier turns, search results included, before the new message", () => {
    const out = transcriptPrompt(
      [
        { role: "user", content: { role: "user", content: "Weighted vests?" } },
        { role: "assistant", content: { role: "assistant", content: "" } },
        { role: "tool", content: { role: "tool", content: "[library:1] Doe (2024)\nMixed.", passages: [] } },
        { role: "assistant", content: { role: "assistant", content: "Mixed evidence [library:1]." } },
      ],
      "And for sleep?",
    );
    expect(out).toBe(
      "Earlier in this conversation:\n\n" +
        "<colleague>\nWeighted vests?\n</colleague>\n\n" +
        "<search_results>\n[library:1] Doe (2024)\nMixed.\n</search_results>\n\n" +
        "<you>\nMixed evidence [library:1].\n</you>\n\n" +
        "Your colleague's new message:\n\nAnd for sleep?",
    );
  });
});
