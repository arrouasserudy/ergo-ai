import { describe, expect, it } from "vitest";
import { findChildName, parseBody, parseInline, replaceChildName, sectionsToPlainText, substituteName } from "./text";

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

  it("replaces a full name", () => {
    expect(substituteName("Jean-Baptiste Dupont progresse. Bravo Jean-Baptiste Dupont.", "Jean-Baptiste Dupont", "Jean")).toBe(
      "Jean progresse. Bravo Jean.",
    );
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

describe("findChildName", () => {
  it("finds the full name and each word of it, whatever the case", () => {
    expect(findChildName("Léa Martin a progressé ; léa était fière. Martine est venue.", "Léa Martin")).toEqual(["Léa Martin", "léa"]);
  });

  it("finds initials but not lone letters", () => {
    expect(findChildName("L.M. tient mieux son crayon. L et M sont des lettres.", "L. M.")).toEqual(["L.M."]);
  });

  it("finds Hebrew names", () => {
    expect(findChildName("נועה כהן שיחקה, נועה צחקה", "נועה כהן")).toEqual(["נועה כהן", "נועה"]);
  });

  it("returns nothing when the name is absent", () => {
    expect(findChildName("L'enfant a progressé.", "Léa Martin")).toEqual([]);
  });
});

describe("replaceChildName", () => {
  it("replaces every form of the name, whatever the case", () => {
    expect(replaceChildName("LÉA MARTIN progresse. Bravo léa !", "Léa Martin", "{{child}}")).toBe("{{child}} progresse. Bravo {{child}} !");
  });
});
