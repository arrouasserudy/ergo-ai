import { describe, expect, it } from "vitest";
import { chunkParagraphs, indexedText } from "./chunking";
import { reciprocalRankFusion, toFtsQuery } from "./fusion";

const para = (section: string, words: number) => ({ section, text: Array.from({ length: words }, (_, i) => `word${i}`).join(" ") + "." });

describe("chunkParagraphs", () => {
  it("never mixes sections", () => {
    const chunks = chunkParagraphs([para("Introduction", 20), para("Introduction", 20), para("Discussion", 20)]);
    expect(chunks.map((c) => c.section)).toEqual(["Introduction", "Discussion"]);
    expect(chunks.map((c) => c.ordinal)).toEqual([0, 1]);
  });

  it("groups paragraphs up to the target size and splits beyond", () => {
    const chunks = chunkParagraphs(Array.from({ length: 12 }, () => para("Results", 60))); // ~12 × 420 chars
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.every((c) => c.text.length <= 2800)).toBe(true);
  });

  it("splits a single huge paragraph at sentence boundaries", () => {
    const long = { section: "Discussion", text: Array.from({ length: 150 }, (_, i) => `Sentence number ${i} is here.`).join(" ") };
    const chunks = chunkParagraphs([long]);
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.every((c) => c.text.endsWith("."))).toBe(true);
  });

  it("keeps page numbers for uploads and drops empty text", () => {
    const chunks = chunkParagraphs([{ section: "p. 3", text: "  ", page: 3 }, { section: "p. 4", text: "Hello.", page: 4 }]);
    expect(chunks).toEqual([{ section: "p. 4", text: "Hello.", ordinal: 0, page: 4 }]);
  });

  it("prefixes the title and section for indexing", () => {
    expect(indexedText("Sensory diets", { section: "Discussion", text: "Body." })).toBe("Sensory diets · Discussion\n\nBody.");
  });
});

describe("reciprocalRankFusion", () => {
  it("favours items ranked well in both lists", () => {
    expect(reciprocalRankFusion([[1, 2, 3], [3, 1, 4]], { limit: 3 })).toEqual([1, 3, 2]);
  });
});

describe("toFtsQuery", () => {
  it("quotes words and drops stopwords and FTS syntax", () => {
    expect(toFtsQuery('weighted vest AND "attention" NEAR(children*)')).toBe('"weighted" OR "vest" OR "attention" OR "near"');
    expect(toFtsQuery("a b")).toBeNull();
  });
});
