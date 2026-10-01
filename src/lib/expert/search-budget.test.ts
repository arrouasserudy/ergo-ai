import { describe, expect, it } from "vitest";
import { searchBudget } from "./search-budget";

describe("searchBudget", () => {
  it("allows a fixed number of searches", () => {
    const budget = searchBudget(2);
    expect(budget.spent).toBe(false);
    expect([budget.take(), budget.take(), budget.take()]).toEqual([true, true, false]);
    expect(budget.spent).toBe(true);
  });
});
