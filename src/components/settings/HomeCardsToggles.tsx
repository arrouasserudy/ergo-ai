"use client";

import { useOptimistic, useTransition } from "react";
import { setHomeCardHidden } from "@/app/actions/settings";
import { Switch } from "@/components/ui/Switch";
import { useI18n } from "@/i18n/client";

type Shown = { week: boolean; guide: boolean };

/** The optional cards of the home page, per therapist. */
export function HomeCardsToggles(props: Shown) {
  const { t } = useI18n();
  const s = t.settings;
  const [shown, setShown] = useOptimistic(props, (current: Shown, change: Partial<Shown>) => ({ ...current, ...change }));
  const [pending, startTransition] = useTransition();

  const toggle = (card: keyof Shown, show: boolean) =>
    startTransition(async () => {
      setShown({ [card]: show });
      await setHomeCardHidden(card, !show);
    });

  return (
    <div className="space-y-4">
      <Switch checked={shown.week} disabled={pending} onChange={(show) => toggle("week", show)} label={s.homeWeekLabel} description={s.homeWeekExample} />
      <Switch checked={shown.guide} disabled={pending} onChange={(show) => toggle("guide", show)} label={s.homeGuideLabel} description={s.homeGuideExample} />
    </div>
  );
}
