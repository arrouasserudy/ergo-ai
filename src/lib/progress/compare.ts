import type { ScoreGroup, ScoreRow } from "@/lib/assessments/types";

// Before / after comparison of two administrations of the same test (Progress tab).
// Pure: it only matches the stored score snapshots and counts; nothing is re-scored or interpreted.

export type RowComparison = {
  id: string;
  label: string;
  unit: ScoreRow["unit"];
  before: ScoreRow | null;
  after: ScoreRow | null;
  /** after − before, when both have a value. */
  difference: number | null;
  /** Both rows are classified and their bands differ. */
  bandChanged: boolean;
};

export type GroupComparison = {
  id: string;
  title: string;
  bands?: string[];
  rows: RowComparison[];
};

/** How many scores of a group changed: band changes for a banded test, value changes otherwise. */
export type ChangeCount = { kind: "bands" | "values"; changed: number; total: number };

const classified = (row: ScoreRow | null): row is ScoreRow & { band: number } => row !== null && row.missing === 0 && typeof row.band === "number";
const valued = (row: ScoreRow | null): row is ScoreRow & { value: number } => row !== null && row.value !== null;

/**
 * Matches groups and rows by id, in the order of the later administration; a group or row
 * found in only one of them keeps a null on the other side (shown with a dash, not charted).
 */
export function compareScores(before: ScoreGroup[], after: ScoreGroup[]): GroupComparison[] {
  const ids = [...new Set([...after.map((g) => g.id), ...before.map((g) => g.id)])];
  return ids.map((id) => {
    const a = before.find((g) => g.id === id);
    const b = after.find((g) => g.id === id);
    const reference = (b ?? a)!;
    const rowIds = [...new Set([...(b?.rows ?? []).map((r) => r.id), ...(a?.rows ?? []).map((r) => r.id)])];
    return {
      id,
      title: reference.title,
      bands: b?.bands ?? a?.bands,
      rows: rowIds.map((rowId) => {
        const rowBefore = a?.rows.find((r) => r.id === rowId) ?? null;
        const rowAfter = b?.rows.find((r) => r.id === rowId) ?? null;
        const row = (rowAfter ?? rowBefore)!;
        return {
          id: rowId,
          label: row.label,
          unit: row.unit,
          before: rowBefore,
          after: rowAfter,
          difference: valued(rowBefore) && valued(rowAfter) ? round(rowAfter.value - rowBefore.value) : null,
          bandChanged: classified(rowBefore) && classified(rowAfter) && rowBefore.band !== rowAfter.band,
        };
      }),
    };
  });
}

/** Rows compared on both sides, and how many of them changed (band, or value for a test without bands). */
export function countChanges(group: GroupComparison): ChangeCount {
  if (group.bands?.length) {
    const rows = group.rows.filter((r) => classified(r.before) && classified(r.after));
    return { kind: "bands", changed: rows.filter((r) => r.bandChanged).length, total: rows.length };
  }
  const rows = group.rows.filter((r) => r.difference !== null);
  return { kind: "values", changed: rows.filter((r) => r.difference !== 0).length, total: rows.length };
}

/** The sum of `countChanges` over the groups of one kind (the kind of the first group). */
export function countAllChanges(groups: GroupComparison[]): ChangeCount | null {
  const counts = groups.map(countChanges).filter((c) => c.total > 0);
  if (counts.length === 0) return null;
  const kind = counts[0].kind;
  const same = counts.filter((c) => c.kind === kind);
  return { kind, changed: same.reduce((s, c) => s + c.changed, 0), total: same.reduce((s, c) => s + c.total, 0) };
}

const parseRange = (range: string | null | undefined): [number, number] | null => {
  if (!range) return null;
  const [lo, hi = lo] = range.split(/[–-]/).map(Number);
  return Number.isFinite(lo) && Number.isFinite(hi) ? [lo, hi] : null;
};

/**
 * Where a classified score sits on a strip of equal band columns (0 = start, 1 = end), as on
 * the paper score sheet: inside its band in proportion to the band's range. Null when the
 * row is not classified or its band has no range.
 */
export function bandPosition(row: ScoreRow | null, bandCount: number): number | null {
  if (!classified(row) || row.value === null || bandCount <= 0) return null;
  const range = parseRange(row.ranges?.[row.band]);
  if (!range) return null;
  const [lo, hi] = range;
  const inside = (Math.min(Math.max(row.value, lo), hi) - lo + 0.5) / (hi - lo + 1);
  return (row.band + inside) / bandCount;
}

/** Upper end of a linear axis from 0 for a test without bands (e.g. play ages in months): a multiple of `step`. */
export function linearMax(groups: GroupComparison[], step: number): number {
  const values = groups.flatMap((g) => g.rows.flatMap((r) => [r.before?.value, r.after?.value])).filter((v): v is number => typeof v === "number");
  return Math.max(step, Math.ceil(Math.max(0, ...values) / step) * step);
}

/** Whole calendar months between two ISO dates (YYYY-MM-DD). */
export function monthsBetween(from: string, to: string): number {
  const [y1, m1, d1] = from.split("-").map(Number);
  const [y2, m2, d2] = to.split("-").map(Number);
  return Math.max(0, (y2 - y1) * 12 + (m2 - m1) - (d2 < d1 ? 1 : 0));
}

const round = (value: number) => Math.round(value * 10) / 10;
