import type { ScoreGroup, ScoreRow } from "./types";

const number = (value: number) => (Number.isInteger(value) ? String(value) : value.toFixed(1));

function rowText(row: ScoreRow, bands: string[] | undefined): string {
  if (row.value === null) return `- ${row.label}: not scored${row.missing ? ` (${row.missing} items unanswered)` : ""}`;
  const value = row.unit === "months" ? `${number(row.value)} months` : row.max !== undefined ? `${number(row.value)}/${row.max}` : number(row.value);
  const band = bands && row.band !== undefined && row.band !== null ? ` — ${bands[row.band]}` : "";
  const missing = row.missing ? ` (${row.missing} items unanswered${bands ? ", not classified" : ""})` : "";
  return `- ${row.label}: ${value}${band}${missing}`;
}

/**
 * Computed scores as text for the report prompt: totals with their maximum and band,
 * or ages in months. Never the answers' free text (comments could hold names).
 */
export function assessmentResultsText(groups: ScoreGroup[]): string {
  return groups
    .filter((g) => g.rows.length)
    .map((g) => [`${g.title}:`, ...g.rows.map((row) => rowText(row, g.bands))].join("\n"))
    .join("\n");
}
