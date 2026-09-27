import { describe, expect, it } from "vitest";
import { initialsOf, maskedName } from "./child-name";

const id = "3f2a1c9e-0000-4000-8000-000000000000";

describe("initialsOf", () => {
  it.each([
    ["Léa Martin", ["L", "M"]],
    ["L. M.", ["L", "M"]],
    ["jean-baptiste dupont durand", ["J", "D"]],
    ["שרה כהן", ["ש", "כ"]],
    ["", []],
  ])("%s", (name, expected) => {
    expect(initialsOf(name)).toEqual(expected);
  });
});

describe("maskedName", () => {
  it("keeps initials and the start of the id, never the name", () => {
    expect(maskedName({ id, name: "Léa Martin" })).toBe("L. M. #3F2A1C");
  });

  it("falls back to the id alone", () => {
    expect(maskedName({ id, name: "…" })).toBe("#3F2A1C");
  });
});
