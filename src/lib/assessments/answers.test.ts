import { describe, expect, it } from "vitest";
import { progress, sanitizeAnswers, unanswered } from "./answers";
import { knoxPreschoolPlayScale as knox } from "./definitions/knox-preschool-play-scale";
import { sensoryProfile2Child as sp2 } from "./definitions/sensory-profile-2-child";

describe("sanitizeAnswers", () => {
  it("keeps known items with allowed values only", () => {
    const clean = sanitizeAnswers(sp2, { values: { i1: 5, i2: 0, i3: 6, i4: "3", nope: 2 }, comments: { auditory: "note", unknown: "x" } });
    expect(clean).toEqual({ values: { i1: 5, i2: 0 }, ticks: {}, comments: { auditory: "note" } });
  });

  it("keeps a level item's levels and its own behaviors", () => {
    const clean = sanitizeAnswers(knox, {
      values: { grossMotor: 18, interests: 7 },
      ticks: { grossMotor: ["grossMotor-18-1", "grossMotor-18-1", "interests-6-1", 3] },
    });
    expect(clean).toEqual({ values: { grossMotor: 18 }, ticks: { grossMotor: ["grossMotor-18-1"] }, comments: {} });
  });

  it("returns empty answers for garbage", () => {
    expect(sanitizeAnswers(sp2, "x")).toEqual({ values: {}, ticks: {}, comments: {} });
    expect(sanitizeAnswers(sp2, { values: [1] })).toEqual({ values: {}, ticks: {}, comments: {} });
  });

  it("reports progress and the unanswered items in order", () => {
    const answers = { values: { i1: 1, i3: 2 }, ticks: {}, comments: {} };
    expect(progress(sp2, answers)).toEqual({ answered: 2, total: 86 });
    expect(unanswered(sp2, answers).slice(0, 2)).toEqual(["i2", "i4"]);
  });
});
