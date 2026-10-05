"use client";

import { useTransition } from "react";
import { setHideNames } from "@/app/actions/settings";
import { Switch } from "@/components/ui/Switch";
import { useI18n } from "@/i18n/client";

/** Hidden mode switch; the choice is kept in a cookie, like the locale. */
export function HideNamesToggle() {
  const { t, hideNames } = useI18n();
  const [pending, startTransition] = useTransition();

  return (
    <Switch
      checked={hideNames}
      disabled={pending}
      onChange={(hide) => startTransition(() => setHideNames(hide))}
      label={t.settings.hideNamesLabel}
      description={t.settings.hideNamesExample}
    />
  );
}
