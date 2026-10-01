import { describe, expect, it } from "vitest";
import { BADGE_TONES, badgeVariant } from "./badges";

describe("badgeVariant", () => {
  it("is deterministic for a child id", () => {
    const id = "46dc2e52-7e12-4cbe-b484-6cfacc71605d";
    expect(badgeVariant(id)).toEqual(badgeVariant(id));
    expect(badgeVariant(id)).toEqual(badgeVariant(`${id}`.slice(0)));
  });

  it("stays within the 12 variants and uses all of them over many ids", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 500; i++) {
      const { tone, shape } = badgeVariant(`child-${i}`);
      expect(tone).toBeGreaterThanOrEqual(0);
      expect(tone).toBeLessThan(BADGE_TONES);
      expect(["filled", "outline"]).toContain(shape);
      seen.add(`${tone}:${shape}`);
    }
    expect(seen.size).toBe(BADGE_TONES * 2);
  });

  it("usually differs between ids", () => {
    const variants = ["a1", "b2", "c3", "d4", "e5", "f6"].map((id) => JSON.stringify(badgeVariant(id)));
    expect(new Set(variants).size).toBeGreaterThan(1);
  });
});
