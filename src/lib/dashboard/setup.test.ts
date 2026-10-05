import { describe, expect, it } from "vitest";
import { SETUP_STEPS, setupGuide, type SetupStep } from "./setup";

describe("setupGuide", () => {
  it("counts the steps done and points to the first one left", () => {
    const guide = setupGuide(new Set<SetupStep>(["child", "autoForm", "amit"]), true);
    expect(guide.total).toBe(SETUP_STEPS.length);
    expect(guide.done).toBe(3);
    expect(guide.next).toBe("letterhead");
    expect(guide.steps.map((s) => s.key)).toEqual([...SETUP_STEPS]);
  });

  it("leaves owner-only steps out for members", () => {
    const guide = setupGuide(new Set<SetupStep>(["child", "letterhead"]), false);
    expect(guide.steps.some((s) => s.key === "letterhead")).toBe(false);
    expect(guide.total).toBe(SETUP_STEPS.length - 1);
    expect(guide.done).toBe(1);
    expect(guide.next).toBe("autoForm");
  });

  it("has no next step once everything is done", () => {
    const guide = setupGuide(new Set(SETUP_STEPS), true);
    expect(guide.done).toBe(guide.total);
    expect(guide.next).toBeNull();
  });
});
