import { getI18n } from "@/i18n/server";
import type { MonthCount } from "@/lib/progress/trend";

type Props = {
  counts: MonthCount[];
  /** Test administrations drawn as dashed markers: local date (YYYY-MM-DD) and label. */
  marks: { date: string; label: string }[];
};

const W = 1000;
const H = 230;
const PAD_X = 36;
const TOP = 46;
const BOTTOM = 38;
/** Room a marker label needs beside its line. */
const LABEL = 240;

/** Line (0 or 1) of each marker label, sorted by x: one too close to the previous goes on the other line. */
function labelRows(xs: number[]): number[] {
  return xs.reduce<number[]>((rows, x, i) => [...rows, i > 0 && x - xs[i - 1] < LABEL ? 1 - rows[i - 1] : 0], []);
}

/**
 * Crises and difficulties per month, stacked, with the test dates marked. The SVG keeps
 * physical coordinates (`direction="ltr"`) and is mirrored here in RTL.
 */
export async function CrisisTrend({ counts, marks }: Props) {
  const i18n = await getI18n();
  const p = i18n.t.progress;
  const rtl = i18n.dir === "rtl";

  const n = counts.length;
  const band = (W - PAD_X * 2) / n;
  const peak = Math.max(4, ...counts.map((c) => c.crisis + c.difficulty));
  const step = peak <= 6 ? 2 : Math.ceil(peak / 3);
  const top = Math.ceil(peak / step) * step;
  const y = (v: number) => H - BOTTOM - (v / top) * (H - BOTTOM - TOP);
  /** Left edge of month `i`'s column, mirrored in RTL. */
  const left = (i: number) => (rtl ? W - PAD_X - (i + 1) * band : PAD_X + i * band);
  const every = n > 36 ? 3 : n > 20 ? 2 : 1;

  // A marker sits inside its month's column, in proportion to the day.
  const placed = marks
    .map((mark) => {
      const i = counts.findIndex((c) => c.month === mark.date.slice(0, 7));
      if (i < 0) return null;
      const fraction = (Number(mark.date.slice(8, 10)) - 0.5) / 31;
      return { ...mark, x: rtl ? left(i) + band * (1 - fraction) : left(i) + band * fraction };
    })
    .filter((m) => m !== null)
    .sort((a, b) => a.x - b.x);
  const rows = labelRows(placed.map((m) => m.x));
  const marked = placed.map((m, i) => ({ ...m, row: rows[i], end: rtl ? m.x > LABEL : m.x > W - LABEL }));

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="block w-full min-w-[640px]" role="img" aria-label={p.crisisTitle} direction="ltr">
        {Array.from({ length: top / step + 1 }, (_, k) => k * step).map((v) => (
          <g key={v}>
            <line x1={PAD_X} x2={W - PAD_X} y1={y(v)} y2={y(v)} className="stroke-line" />
            <text x={rtl ? W - PAD_X + 8 : PAD_X - 8} y={y(v) + 4} textAnchor={rtl ? "start" : "end"} className="fill-ink-muted text-[11px]">
              {v}
            </text>
          </g>
        ))}
        {counts.map((c, i) => {
          const x = left(i) + band * 0.18;
          const width = band * 0.64;
          const first = i === 0 || c.month.endsWith("-01");
          return (
            <g key={c.month}>
              <title>{p.bar(i18n.monthTitle(c.month), c.crisis, c.difficulty)}</title>
              {c.difficulty > 0 && <rect x={x} y={y(c.difficulty)} width={width} height={y(0) - y(c.difficulty)} rx={2} className="fill-warn-ink/35" />}
              {c.crisis > 0 && (
                <rect x={x} y={y(c.difficulty + c.crisis)} width={width} height={y(c.difficulty) - y(c.difficulty + c.crisis)} rx={2} className="fill-warn-ink" />
              )}
              {(i % every === 0 || first) && (
                <text x={left(i) + band / 2} y={H - 22} textAnchor="middle" className="fill-ink-muted text-[11px]">
                  {i18n.monthShort(c.month)}
                </text>
              )}
              {first && (
                <text x={left(i) + band / 2} y={H - 6} textAnchor="middle" className="fill-ink-muted text-[10.5px]">
                  {c.month.slice(0, 4)}
                </text>
              )}
            </g>
          );
        })}
        {marked.map((m) => (
          <g key={m.date}>
            <line x1={m.x} x2={m.x} y1={TOP - 8 - m.row * 15} y2={y(0)} strokeDasharray="4 3" className="stroke-primary" />
            <text
              x={m.x + (m.end ? -5 : 5)}
              y={14 + m.row * 15}
              textAnchor={m.end ? "end" : "start"}
              className="fill-primary text-[11.5px]"
            >
              {m.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
