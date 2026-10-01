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

  it.each([
    ["comment faire manger J C?", "comment faire manger X?"],
    ["J.C. mange peu", "X mange peu"],
    ["avec J. C. et sa mère", "avec X et sa mère"],
    ["JC refuse", "X refuse"],
    ["j c refuse", "X refuse"],
    ["J-C refuse", "X refuse"],
  ])("replaces initials typed as %s", (input, expected) => {
    expect(replaceChildName(input, "J. C.", "X")).toBe(expected);
  });

  it("leaves ordinary words alone", () => {
    const text = "Je pense que ça va, c'est jc ou JCB ? J'ai vu J et C. Jc";
    expect(replaceChildName(text, "J. C.", "X")).toBe(text);
    const la = "Comment la faire manger ? Là, elle est là. Et E et T.";
    expect(replaceChildName(la, "L. A.", "X")).toBe(la);
    expect(replaceChildName(la, "E. T.", "X")).toBe(la);
    expect(replaceChildName("Le Goff arrive, le chat aussi. Goff rit.", "Le Goff", "X")).toBe("X arrive, le chat aussi. X rit.");
  });

  it("ignores accents and case", () => {
    expect(replaceChildName("Lea est venue, LÉA aussi, puis lèa.", "Léa Martin", "X")).toBe("X est venue, X aussi, puis X.");
    expect(replaceChildName("Noemie et Zoé", "Noémie Zoe", "X")).toBe("X et X");
  });

  it("finds the initials of a full name", () => {
    expect(replaceChildName("L. M. et LM, pas lm.", "Léa Martin", "X")).toBe("X et X, pas lm.");
  });

  it("works with Hebrew vowel points", () => {
    expect(replaceChildName("נוֹעָה שיחקה", "נועה כהן", "X")).toBe("X שיחקה");
  });
});
