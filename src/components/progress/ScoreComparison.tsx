import clsx from "clsx";
import { ArrowRight } from "lucide-react";
import type { CSSProperties } from "react";
import { getI18n } from "@/i18n/server";
import type { AssessmentLanguage, ScoreRow } from "@/lib/assessments/types";
import { bandPosition, type GroupComparison, type RowComparison } from "@/lib/progress/compare";

type Props = {
  group: GroupComparison;
  /** Display dates of the two administrations; `before` is null when only one is completed. */
  beforeDate: string | null;
  afterDate: string;
  language: AssessmentLanguage;
  /** Axis of a test without bands: 0 to `max`, a gridline every `step`. */
  linear?: { max: number; step: number };
};

const BAND_SHADES = ["bg-line/70", "bg-surface-muted", "bg-tint/80", "bg-surface-muted", "bg-line/70"];

/** Logical position on the strip, so the chart mirrors in RTL. */
const at = (fraction: number): CSSProperties => ({ insetInlineStart: `${fraction * 100}%` });

/**
 * One score group as a strip per row: the test's bands as equal columns (or a linear axis
 * when the test has none), the earlier administration as a hollow dot, the later one filled.
 * Values, differences and band changes are read from the stored snapshots, never re-scored.
 */
export async function ScoreComparison({ group, beforeDate, afterDate, language, linear }: Props) {
  const i18n = await getI18n();
  const p = i18n.t.progress;
  const testDir = language === "he" ? "rtl" : "ltr";
  const bands = group.bands?.length ? group.bands : null;

  const position = (row: ScoreRow | null): number | null => {
    if (!row || row.value === null) return null;
    if (bands) return bandPosition(row, bands.length);
    return linear ? Math.min(row.value / linear.max, 1) : null;
  };
  const value = (row: ScoreRow | null) => (row?.value === null || row?.value === undefined ? "—" : i18n.number(row.value));
  const bandName = (row: ScoreRow | null) => (bands && row && typeof row.band === "number" && row.missing === 0 ? bands[row.band] : null);
  const ticks = linear ? Array.from({ length: Math.floor(linear.max / linear.step) + 1 }, (_, i) => i * linear.step) : [];

  const grid = "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 sm:grid-cols-[minmax(0,10rem)_minmax(0,1fr)_15rem]";
  // Narrow screens: label and values on one line, the strip under them.
  const stripCell = "order-3 col-span-2 sm:order-2 sm:col-span-1";

  const strip = (row: RowComparison) => {
    const before = position(row.before);
    const after = position(row.after);
    const span = before !== null && after !== null ? [Math.min(before, after), Math.abs(after - before)] : null;
    return (
      <div className="relative h-8">
        <div className="absolute inset-0 flex overflow-hidden rounded-md">
          {bands
            ? bands.map((band, i) => <div key={band} className={clsx("flex-1 border-e border-surface last:border-e-0", BAND_SHADES[i] ?? "bg-surface-muted")} />)
            : <div className="flex-1 bg-surface-muted" />}
        </div>
        {ticks.slice(1, -1).map((tick) => (
          <div key={tick} className="absolute inset-y-0 w-px bg-line" style={at(tick / linear!.max)} />
        ))}
        {span && <div className="absolute top-1/2 h-0.5 -translate-y-1/2 bg-primary/45" style={{ ...at(span[0]), width: `${span[1] * 100}%` }} />}
        {before !== null && (
          <span
            title={p.dot(beforeDate ?? "", value(row.before), bandName(row.before))}
            className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-ink-muted bg-surface rtl:translate-x-1/2"
            style={at(before)}
          />
        )}
        {after !== null && (
          <span
            title={p.dot(afterDate, value(row.after), bandName(row.after))}
            className="absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary ring-3 ring-surface rtl:translate-x-1/2"
            style={at(after)}
          />
        )}
      </div>
    );
  };

  const values = (row: RowComparison) => {
    const unit = p.unit[row.unit] ?? "";
    const incomplete = (row.before?.missing ?? 0) > 0 || (row.after?.missing ?? 0) > 0;
    const from = bandName(row.before);
    const to = bandName(row.after);
    return (
      <div className="flex max-w-[11rem] flex-col items-end gap-0.5 text-end sm:max-w-none sm:items-start sm:text-start">
        <span className="flex items-center gap-1 text-[13px] whitespace-nowrap tabular-nums">
          {row.before && (
            <>
              <span className="text-ink-muted">{value(row.before)}</span>
              <ArrowRight className="size-3 text-ink-muted rtl:rotate-180" aria-hidden />
            </>
          )}
          <span className="font-semibold">{value(row.after)}</span>
          {row.difference !== null && (
            <span className="text-ink-muted">
              ({row.difference > 0 ? "+" : row.difference < 0 ? "−" : "±"}
              {i18n.number(Math.abs(row.difference))} {unit})
            </span>
          )}
        </span>
        {incomplete ? (
          <span className="text-[11.5px] text-warn-ink">{p.incomplete}</span>
        ) : row.bandChanged && from && to ? (
          <span dir={testDir} className="rounded-full bg-tint px-2 py-px text-[11px] leading-snug text-tint-ink">
            {from} {testDir === "rtl" ? "←" : "→"} {to}
          </span>
        ) : (
          (row.before ? from && to && <span className="text-[11.5px] text-ink-muted">{p.sameBand}</span> : to && <bdi className="text-[11.5px] text-ink-muted">{to}</bdi>)
        )}
      </div>
    );
  };

  return (
    <div className="space-y-1.5">
      <div className={clsx(grid, "text-[10.5px] leading-tight text-ink-muted")} aria-hidden>
        <div className="order-1 sm:order-1" />
        <div className={clsx(stripCell, "relative flex")}>
          {bands
            ? bands.map((band) => (
                <bdi key={band} className="flex-1 px-0.5 text-center">
                  {band}
                </bdi>
              ))
            : ticks.map((tick) => (
                <span key={tick} className="absolute bottom-0 -translate-x-1/2 tabular-nums rtl:translate-x-1/2" style={at(tick / linear!.max)}>
                  {tick}
                </span>
              ))}
          {!bands && <span className="invisible">0</span>}
        </div>
        <div className="order-2 sm:order-3" />
      </div>
      {group.rows.map((row) => (
        <div key={row.id} className={clsx(grid, "gap-y-1 py-1")}>
          <bdi className={clsx("order-1 min-w-0 text-[13px] leading-tight", row.bandChanged ? "font-semibold" : "text-ink-soft")}>{row.label}</bdi>
          <div className={stripCell}>{strip(row)}</div>
          <div className="order-2 sm:order-3">{values(row)}</div>
        </div>
      ))}
    </div>
  );
}
