import clsx from "clsx";
import { Check, ChevronRight, PartyPopper } from "lucide-react";
import Link from "next/link";
import { HideCardButton } from "@/components/dashboard/HideCardButton";
import { Card, CardHeader } from "@/components/ui/Card";
import { getI18n } from "@/i18n/server";
import type { SetupGuide } from "@/lib/dashboard/setup";

/** First steps in the app, ticked from what already exists; hidden from here or the settings. */
export async function SetupGuideCard({ guide }: { guide: SetupGuide }) {
  const { t } = await getI18n();
  const s = t.dashboard.setup;
  const complete = guide.next === null;
  const hide = <HideCardButton card="guide" label={s.hide} />;

  if (complete) {
    return (
      <Card>
        <div className="flex items-center gap-3 px-5 py-4">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-ok text-ok-ink">
            <PartyPopper className="size-[18px]" strokeWidth={1.75} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] font-semibold tracking-tight">{s.doneTitle}</span>
            <span className="block text-[12.5px] text-ink-muted">{s.doneHint}</span>
          </span>
          {hide}
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader title={s.title} hint={s.hint} action={hide} />
      <div className="flex items-center gap-3 px-5 pb-3">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-tint" role="progressbar" aria-valuemin={0} aria-valuemax={guide.total} aria-valuenow={guide.done}>
          <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${(guide.done / guide.total) * 100}%` }} />
        </div>
        <span className="text-[12px] font-medium text-ink-soft tabular-nums">{s.progress(guide.done, guide.total)}</span>
      </div>
      <ul className="divide-y divide-line border-t border-line">
        {guide.steps.map((step) => {
          const copy = s.steps[step.key];
          const next = step.key === guide.next;
          return (
            <li key={step.key}>
              <Link href={step.href} className="flex items-center gap-3 px-5 py-2.5 transition-colors hover:bg-surface-muted">
                <span
                  className={clsx(
                    "grid size-6 shrink-0 place-items-center rounded-full border",
                    step.done ? "border-transparent bg-ok text-ok-ink" : next ? "border-primary" : "border-line-strong",
                  )}
                >
                  {step.done && <Check className="size-3.5" strokeWidth={2.5} />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className={clsx("block truncate text-[13.5px]", step.done ? "text-ink-muted" : "font-medium")}>{copy.title}</span>
                  {!step.done && <span className="block truncate text-[12px] text-ink-muted">{copy.hint}</span>}
                </span>
                {!step.done && <ChevronRight className={clsx("size-4 shrink-0 rtl:rotate-180", next ? "text-primary" : "text-ink-muted")} />}
              </Link>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
