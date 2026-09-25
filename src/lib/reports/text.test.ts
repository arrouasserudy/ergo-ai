import { describe, expect, it } from "vitest";
import { parseBody, parseInline, sectionsToPlainText, substituteName } from "./text";

describe("substituteName", () => {
  it.each([
    ["L. M. tient son crayon.", "Léo tient son crayon."],
    ["Bravo à L.M. !", "Bravo à Léo !"],
    ["Pour L. M, c'est mieux", "Pour Léo, c'est mieux"],
  ])("replaces the initials in %s", (input, expected) => {
    expect(substituteName(input, "L. M.", "Léo")).toBe(expected);
  });

  it("leaves other capitals and words alone", () => {
    const text = "Le Médecin a vu L. et M. hier; LMNOP reste.";
    expect(substituteName(text, "L. M.", "Léo")).toBe(text);
  });

  it("works with Hebrew initials", () => {
    expect(substituteName("ל. מ. מחזיק עיפרון", "ל. מ.", "נועה")).toBe("נועה מחזיק עיפרון");
  });

  it("changes nothing without a name", () => {
    expect(substituteName("L. M. progresse", "L. M.", "  ")).toBe("L. M. progresse");
  });
});

describe("parseBody", () => {
  it("splits paragraphs and lists", () => {
    const blocks = parseBody("Premier **point** clé.\nsuite\n\n- un\n- deux\nFin");
    expect(blocks).toEqual([
      { type: "paragraph", inlines: [{ text: "Premier ", bold: false }, { text: "point", bold: true }, { text: " clé. suite", bold: false }] },
      { type: "list", items: [[{ text: "un", bold: false }], [{ text: "deux", bold: false }]] },
      { type: "paragraph", inlines: [{ text: "Fin", bold: false }] },
    ]);
  });

  it("keeps unmatched ** as text", () => {
    expect(parseInline("a ** b")).toEqual([{ text: "a ** b", bold: false }]);
  });
});

describe("sectionsToPlainText", () => {
  it("drops markdown markers", () => {
    expect(sectionsToPlainText([{ heading: "Ce qui avance", body: "**Bravo**\n- un" }])).toBe("Ce qui avance\n\nBravo\n\n- un");
  });
});
