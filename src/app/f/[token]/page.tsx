import { FileText, Lock } from "lucide-react";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { SharedFormFill, Thanks } from "@/components/forms/SharedFormFill";
import { createI18n } from "@/i18n";
import { I18nProvider } from "@/i18n/client";
import { getI18n } from "@/i18n/server";
import { findSharedForm } from "@/lib/forms/queries";
import { APP_TIME_ZONE } from "@/lib/time";

// Public (see proxy.ts): the link's token is the only credential. The child's name is
// never shown, in case the link is forwarded.

export const metadata: Metadata = { robots: { index: false, follow: false }, referrer: "no-referrer" };

export default async function SharedFormPage(props: PageProps<"/f/[token]">) {
  const { token } = await props.params;
  const found = findSharedForm(token);

  if (!found) {
    const { t, locale } = await getI18n();
    return (
      <Shell locale={locale} appName={t.app.name}>
        <div className="flex flex-col items-center gap-2 py-10 text-center">
          <p className="font-serif text-2xl">{t.forms.public.unavailableTitle}</p>
          <p className="max-w-md text-[14px] text-ink-muted">{t.forms.public.unavailableBody}</p>
        </div>
      </Shell>
    );
  }

  const { form, cabinet } = found;
  const locale = form.schema.language;
  const { t } = createI18n(locale, APP_TIME_ZONE);
  const p = t.forms.public;

  return (
    <Shell locale={locale} appName={t.app.name}>
      <header className="mb-6 space-y-2 border-b border-line pb-5">
        <p className="text-[12.5px] text-ink-muted">
          <bdi>{p.from(cabinet)}</bdi>
        </p>
        <h1 className="font-serif text-[28px] leading-tight font-medium">{form.schema.title}</h1>
        {form.schema.description && <p className="text-[14px] whitespace-pre-line text-ink-soft">{form.schema.description}</p>}
        <p className="flex items-center gap-1.5 text-[12px] text-ok-ink">
          <Lock className="size-3.5" />
          {p.privacy}
        </p>
      </header>
      {form.status === "submitted" ? <Thanks /> : <SharedFormFill token={token} form={form.schema} initial={form.answers} />}
    </Shell>
  );
}

/** The page chrome follows the form's language, whatever the visitor's cookie says. */
function Shell({ locale, appName, children }: { locale: "fr" | "he" | "en"; appName: string; children: ReactNode }) {
  return (
    <I18nProvider locale={locale} timeZone={APP_TIME_ZONE} hideNames={false}>
      <div dir={locale === "he" ? "rtl" : "ltr"} lang={locale} className="mx-auto min-h-dvh max-w-2xl px-4 py-6 sm:py-10">
        <div className="mb-5 flex items-center gap-2 text-ink-muted">
          <span className="grid size-6 place-items-center rounded-md bg-primary text-white">
            <FileText className="size-3.5" strokeWidth={2} />
          </span>
          <span className="font-serif text-[15px]">{appName}</span>
        </div>
        <main className="rounded-xl border border-line bg-surface p-5 sm:p-7">{children}</main>
      </div>
    </I18nProvider>
  );
}
