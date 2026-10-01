/** Literature searches allowed per answer (one user turn), whatever the model asks for. */
export const MAX_SEARCHES_PER_ANSWER = 3;

/** Passages returned per search (~2,000–2,800 characters each). */
export const PASSAGES_PER_SEARCH = 5;

/** Tool result for a search beyond the budget. */
export const SEARCH_BUDGET_SPENT =
  "Search budget for this answer is spent: no more searches. Answer now with the passages already retrieved, and say if they leave gaps.";

/** Counts the searches of one answer: `take()` is false once the budget is spent. */
export function searchBudget(max = MAX_SEARCHES_PER_ANSWER) {
  let used = 0;
  return {
    take() {
      if (used >= max) return false;
      used++;
      return true;
    },
    get spent() {
      return used >= max;
    },
  };
}
