import { describe, expect, it } from "vitest";
import { needsAttention } from "./child-attention";

const today = "2026-10-01";
const form = (id: string, dueDate: string | null, status = "draft") => ({ id, status, dueDate, schema: { title: id } });
const report = (id: string, status: string, updatedAt: string) => ({ id, status, docType: "follow_up", sessionDate: "2026-09-01", updatedAt: new Date(updatedAt) });
const test = (id: string, status: string, testDate: string) => ({ id, status, definitionId: "sp2", testDate });

describe("needsAttention", () => {
  it("lists overdue then soon forms, drafts, then unfinished tests", () => {
    const items = needsAttention({
      forms: [form("soon-late", "2026-10-10"), form("far", "2026-12-01"), form("overdue", "2026-09-20"), form("soon-early", "2026-10-03"), form("none", null)],
      reports: [report("old", "draft", "2026-09-01T10:00:00Z"), report("done", "validated", "2026-09-30T10:00:00Z"), report("new", "draft", "2026-09-29T10:00:00Z")],
      assessments: [test("t-done", "completed", "2026-09-30"), test("t-old", "draft", "2026-08-01"), test("t-new", "sent", "2026-09-15")],
      today,
      warnDays: 14,
    });
    expect(items.map((i) => i.id)).toEqual(["overdue", "soon-early", "soon-late", "new", "old", "t-new", "t-old"]);
    expect(items[0]).toMatchObject({ kind: "form", level: "overdue" });
    expect(items[1]).toMatchObject({ kind: "form", level: "soon" });
  });

  it("ignores submitted forms, even past their due date", () => {
    expect(needsAttention({ forms: [form("sent", "2026-09-01", "submitted")], reports: [], assessments: [], today, warnDays: 14 })).toEqual([]);
  });
});
