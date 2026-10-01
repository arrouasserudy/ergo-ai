/** Ordering of the home page lists (pure, tested). */

type ChildRef = { id: string; name: string };

export type TodoItem =
  | { kind: "form"; id: string; child: ChildRef; title: string; dueDate: string; level: "soon" | "overdue" }
  | { kind: "report"; id: string; child: ChildRef; docType: string; sessionDate: string; updatedAt: Date };

export type ActivityItem =
  | { kind: "episode"; id: string; child: ChildRef; at: Date; episodeKind: "crisis" | "difficulty" }
  | { kind: "form"; id: string; child: ChildRef; at: Date; title: string; byParent: boolean }
  | { kind: "assessment"; id: string; child: ChildRef; at: Date; testName: string };

/** Overdue forms, then forms due soon (earliest first), then drafts (most recently touched first). */
export function sortTodo(items: TodoItem[]): TodoItem[] {
  const rank = (item: TodoItem) => (item.kind === "form" ? (item.level === "overdue" ? 0 : 1) : 2);
  return [...items].sort((a, b) => {
    const byRank = rank(a) - rank(b);
    if (byRank !== 0) return byRank;
    if (a.kind === "form" && b.kind === "form") return a.dueDate.localeCompare(b.dueDate);
    if (a.kind === "report" && b.kind === "report") return b.updatedAt.getTime() - a.updatedAt.getTime();
    return 0;
  });
}

/** Newest first. */
export function sortActivity(items: ActivityItem[]): ActivityItem[] {
  return [...items].sort((a, b) => b.at.getTime() - a.at.getTime());
}

/** The first `limit` items and how many were left out. */
export function take<T>(items: T[], limit: number): { items: T[]; more: number } {
  return { items: items.slice(0, limit), more: Math.max(0, items.length - limit) };
}
