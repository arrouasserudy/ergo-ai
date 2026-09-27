"use client";

import clsx from "clsx";
import { useTransition } from "react";
import { setHideNames } from "@/app/actions/settings";
import { useI18n } from "@/i18n/client";

/** Hidden mode switch; the choice is kept in a cookie, like the locale. */
export function HideNamesToggle() {
  const { t, hideNames } = useI18n();
  const [pending, startTransition] = useTransition();

  return (
    <label className={clsx("flex cursor-pointer items-center justify-between gap-4", pending && "opacity-70")}>
      <span className="min-w-0">
        <span className="block text-[14px] font-medium">{t.settings.hideNamesLabel}</span>
        <span className="block text-[12.5px] text-ink-muted">{t.settings.hideNamesExample}</span>
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={hideNames}
        disabled={pending}
        onClick={() => startTransition(() => setHideNames(!hideNames))}
        className={clsx(
          "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors",
          hideNames ? "bg-primary" : "bg-line-strong",
        )}
      >
        <span
          className={clsx(
            "inline-block size-5 rounded-full bg-white shadow-sm transition-transform",
            hideNames ? "translate-x-5.5 rtl:-translate-x-5.5" : "translate-x-0.5 rtl:-translate-x-0.5",
          )}
        />
      </button>
    </label>
  );
}
