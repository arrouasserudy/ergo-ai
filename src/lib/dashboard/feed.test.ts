import { describe, expect, it } from "vitest";
import { sortActivity, sortTodo, take, type ActivityItem, type TodoItem } from "./feed";

const child = { id: "c1", name: "L. M." };

describe("sortTodo", () => {
  it("puts overdue forms first, then forms due soon, then drafts", () => {
    const items: TodoItem[] = [
      { kind: "report", id: "r-old", child, docType: "follow_up", sessionDate: "2026-09-01", updatedAt: new Date("2026-09-01T10:00:00Z") },
      { kind: "form", id: "f-soon-late", child, title: "B", dueDate: "2026-10-20", level: "soon" },
      { kind: "report", id: "r-new", child, docType: "follow_up", sessionDate: "2026-09-30", updatedAt: new Date("2026-09-30T10:00:00Z") },
      { kind: "form", id: "f-soon-early", child, title: "A", dueDate: "2026-10-05", level: "soon" },
      { kind: "form", id: "f-overdue", child, title: "C", dueDate: "2026-09-15", level: "overdue" },
    ];
    expect(sortTodo(items).map((i) => i.id)).toEqual(["f-overdue", "f-soon-early", "f-soon-late", "r-new", "r-old"]);
  });
});

describe("sortActivity", () => {
  it("lists the newest first, whatever the kind", () => {
    const items: ActivityItem[] = [
      { kind: "episode", id: "e", child, at: new Date("2026-09-28T10:00:00Z"), episodeKind: "crisis" },
      { kind: "assessment", id: "a", child, at: new Date("2026-09-30T10:00:00Z"), testName: "SP2" },
      { kind: "form", id: "f", child, at: new Date("2026-09-29T10:00:00Z"), title: "Anamnèse", byParent: true },
    ];
    expect(sortActivity(items).map((i) => i.id)).toEqual(["a", "f", "e"]);
  });
});

describe("take", () => {
  it("counts what is left out", () => {
    expect(take([1, 2, 3, 4, 5, 6, 7], 5)).toEqual({ items: [1, 2, 3, 4, 5], more: 2 });
    expect(take([1, 2], 5)).toEqual({ items: [1, 2], more: 0 });
  });
});
