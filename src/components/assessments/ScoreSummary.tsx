"use client";

import clsx from "clsx";
import { useI18n } from "@/i18n/client";
import type { AssessmentLanguage, ScoreGroup, ScoreRow } from "@/lib/assessments/types";

type Props = {
  groups: ScoreGroup[];
  language: AssessmentLanguage;
  /** The same test's previous completed administration, for before / after. */
  previous?: { date: string; groups: ScoreGroup[] } | null;
  print?: boolean;
};

const format = (value: number) => (Number.isInteger(value) ? String(value) : value.toFixed(1));

/**
 * Score tables: with bands, the classification grid of the test (the child's band
 * highlighted); without, values such as ages in months.
 */
export function ScoreSummary({ groups, language, previous, print = false }: Props) {
  const { t } = useI18n();
  const a = t.assessments;
  const previousRow = (groupId: string, rowId: string) => previous?.groups.find((g) => g.id === groupId)?.rows.find((r) => r.id === rowId);

  const value = (row: ScoreRow | undefined) => {
    if (!row || row.value === null) return "—";
    const unit = row.unit === "months" ? ` ${a.months}` : row.max !== undefined ? ` / ${row.max}` : "";
    return `${format(row.value)}${unit}`;
  };

  return (
    <div className="space-y-6" dir={language === "he" ? "rtl" : "ltr"} lang={language}>
      {groups.map((group) => (
        <div key={group.id} className={clsx("overflow-x-auto", print && "break-inside-avoid")}>
          <table className="w-full border-collapse text-[13px]">
            <caption className={clsx("mb-2 text-start font-semibold", print ? "text-[12pt]" : "text-[15px]")}>{group.title}</caption>
            <thead>
              <tr className="border-b border-line-strong text-[11.5px] text-ink-muted">
                <th />
                {previous && (
                  <th scope="col" className="px-2 pb-1.5 text-end font-medium">
                    {a.previous(previous.date)}
                  </th>
                )}
                <th scope="col" className="px-2 pb-1.5 text-end font-medium">
                  {previous ? a.now : a.score}
                </th>
                {group.bands?.map((band) => (
                  <th key={band} scope="col" className="w-24 px-1.5 pb-1.5 text-center leading-tight font-medium">
                    {band}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {group.rows.map((row) => {
                const before = previousRow(group.id, row.id);
                return (
                  <tr key={row.id}>
                    <th scope="row" className="py-2 pe-3 text-start font-medium">
                      {row.label}
                      {row.missing > 0 && (
                        <span className="block text-[11.5px] font-normal text-warn-ink">
                          {a.missing(row.missing)}
                          {group.bands && ` · ${a.notClassified}`}
                        </span>
                      )}
                    </th>
                    {previous && <td className="px-2 text-end whitespace-nowrap text-ink-muted tabular-nums">{value(before)}</td>}
                    <td className="px-2 text-end font-medium whitespace-nowrap tabular-nums">{value(row)}</td>
                    {group.bands?.map((band, i) => {
                      const current = row.band === i;
                      const past = before?.band === i;
                      return (
                        <td key={band} className="px-1 py-1">
                          <span
                            className={clsx(
                              "flex h-8 items-center justify-center rounded-md text-[12px] tabular-nums",
                              current ? "bg-primary font-semibold text-primary-ink print:border print:border-black print:bg-transparent print:text-black" : "text-ink-muted",
                              !current && past && "ring-1 ring-ink-muted ring-inset",
                            )}
                          >
                            {row.ranges?.[i] ?? "—"}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}
