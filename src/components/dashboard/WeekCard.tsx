import clsx from "clsx";
import { Flame } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { getI18n } from "@/i18n/server";
import { weekStartOf } from "@/lib/calendar/month";
import { STALE_DRAFT_DAYS, type WeekState } from "@/lib/dashboard/streak";

const RADIUS = 22;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/** Progress of this week's to-do list and the streak of up-to-date weeks. */
export async function WeekCard({ week }: { week: WeekState }) {
  const i18n = await getI18n();
  const w = i18n.t.dashboard.week;
  const total = week.cleared + week.remaining;
  const ratio = total === 0 ? 1 : week.cleared / total;
  const lastDay = i18n.weekday((weekStartOf(i18n.locale) + 6) % 7, "long");
  const status =
    week.late > 0
      ? (week.streak > 0 ? w.lateKeep : w.lateStart)(week.late, lastDay)
      : (week.streak > 0 ? w.onTrackKeep : w.onTrackStart)(lastDay);

  return (
    <Card>
      <CardHeader title={w.title} hint={w.rule(STALE_DRAFT_DAYS)} />
      <div className="flex flex-wrap items-center gap-x-10 gap-y-4 px-5 pb-4">
        <div className="flex items-center gap-3">
          <svg viewBox="0 0 56 56" className="size-14 shrink-0 -rotate-90 rtl:-scale-x-100" aria-hidden>
            <circle cx="28" cy="28" r={RADIUS} fill="none" strokeWidth="6" className="stroke-tint" />
            <circle
              cx="28"
              cy="28"
              r={RADIUS}
              fill="none"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={CIRCUMFERENCE * (1 - ratio)}
              className="stroke-primary transition-[stroke-dashoffset]"
            />
          </svg>
          {total === 0 ? (
            <p className="text-[13px] text-ink-muted">{w.nothing}</p>
          ) : (
            <p>
              <span dir="ltr" className="block text-[22px] leading-none font-semibold tracking-tight tabular-nums rtl:text-end">
                {week.cleared}
                <span className="text-[15px] font-medium text-ink-muted">/{total}</span>
              </span>
              <span className="mt-1 block text-[12.5px] text-ink-muted">{w.clearedLabel}</span>
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className={clsx("grid size-11 shrink-0 place-items-center rounded-full", week.streak > 0 ? "bg-warn text-warn-ink" : "bg-surface-muted text-ink-muted")}>
            <Flame className="size-5" strokeWidth={1.75} />
          </span>
          <p className="text-[15px] font-semibold tracking-tight">{w.streak(week.streak)}</p>
        </div>
      </div>
      <p className={clsx("border-t border-line px-5 py-3 text-[12.5px]", week.late > 0 ? "text-danger" : "text-ok-ink")}>{status}</p>
    </Card>
  );
}
