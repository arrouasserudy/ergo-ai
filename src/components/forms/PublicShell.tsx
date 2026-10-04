import clsx from "clsx";
import { OtioMark } from "@/components/brand/OtioMark";
import type { ReactNode } from "react";
import { I18nProvider } from "@/i18n/client";
import { APP_TIME_ZONE } from "@/lib/time";

/** Chrome of the public parent pages: follows the form's or test's language, whatever the visitor's cookie says. */
export function PublicShell({ locale, appName, wide = false, children }: { locale: "fr" | "he" | "en"; appName: string; wide?: boolean; children: ReactNode }) {
  return (
    <I18nProvider locale={locale} timeZone={APP_TIME_ZONE} hideNames={false}>
      <div dir={locale === "he" ? "rtl" : "ltr"} lang={locale} className={clsx("mx-auto min-h-dvh px-4 py-6 sm:py-10", wide ? "max-w-4xl" : "max-w-2xl")}>
        <div className="mb-5 flex items-center gap-2 text-ink-muted">
          <OtioMark size={26} />
          <span className="text-[14px] font-semibold text-ink">{appName}</span>
        </div>
        <main className="rounded-2xl border border-line bg-surface shadow-card p-5 sm:p-7">{children}</main>
      </div>
    </I18nProvider>
  );
}
