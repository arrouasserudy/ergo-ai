"use client";

import clsx from "clsx";
import { useTransition } from "react";
import { setLocale } from "@/app/actions/locale";
import { LOCALES, LOCALE_NAMES } from "@/i18n";
import { useI18n } from "@/i18n/client";

/** Language toggle (Français / עברית / English); the choice is kept in a cookie. */
export function LocaleSwitcher() {
  const { locale, t } = useI18n();
  const [pending, startTransition] = useTransition();

  return (
    <div
      role="group"
      aria-label={t.language.label}
      className={clsx(
        "inline-flex rounded-full p-1 text-[12.5px]",
        "border border-line-strong bg-surface-muted",
        pending && "opacity-70",
      )}
    >
      {LOCALES.map((l) => (
        <button
          key={l}
          type="button"
          lang={l}
          aria-pressed={locale === l}
          disabled={pending}
          onClick={() => startTransition(() => setLocale(l))}
          className={clsx(
            "min-h-9 rounded-full px-3 py-1 transition-colors",
            locale === l ? "bg-surface font-medium text-ink shadow-sm" : "text-ink-muted hover:text-ink",
          )}
        >
          {LOCALE_NAMES[l]}
        </button>
      ))}
    </div>
  );
}
