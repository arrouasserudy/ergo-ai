import { ArrowLeft, Check, FileText } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { LocaleSwitcher } from "@/components/shell/LocaleSwitcher";
import { getI18n } from "@/i18n/server";
import { embedProvider } from "@/lib/expert/embeddings";
import { defaultProvider } from "@/lib/expert/providers";
import { transcriptionAvailable } from "@/lib/reports/transcribe";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: `${t.privacy.page.title} · ${t.app.name}` };
}

/** Public: linked from the login page and from the badge on everything sent to the AI. */
export default async function PrivacyPage() {
  const { t } = await getI18n();
  const p = t.privacy.page;

  // Providers as configured on this server, so the page stays true when the keys change.
  const chat = defaultProvider() ?? "none";
  const providers: Record<string, string> = {
    reports: chat,
    dictation: transcriptionAvailable() ? "openai" : "none",
    expert: chat,
    search: embedProvider() ?? "none",
  };

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-8 sm:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/" className="inline-flex items-center gap-1.5 text-[13px] text-ink-muted hover:text-ink">
          <ArrowLeft className="size-4 rtl:rotate-180" />
          {p.back}
        </Link>
        <LocaleSwitcher />
      </div>

      <header className="space-y-2">
        <div className="flex items-center gap-2.5">
          <span className="grid size-7 place-items-center rounded-md bg-primary text-white">
            <FileText className="size-4" strokeWidth={2} />
          </span>
          <span className="font-serif text-xl font-medium">{t.app.name}</span>
        </div>
        <h1 className="font-serif text-[32px] leading-tight font-medium">{p.heading}</h1>
        <p className="text-[14px] text-ink-muted">{p.intro}</p>
      </header>

      <ul className="grid gap-2 sm:grid-cols-2">
        {p.essentials.map((item) => (
          <li key={item} className="flex gap-2 rounded-xl border border-line bg-surface px-4 py-3 text-[14px]">
            <Check className="mt-0.5 size-4 shrink-0 text-ok-ink" />
            {item}
          </li>
        ))}
      </ul>

      <Section id="ai" title={p.aiTitle}>
        <p>{p.aiIntro}</p>
        <div className="overflow-x-auto rounded-xl border border-line bg-surface">
          <table className="w-full min-w-[32rem] text-start text-[13.5px]">
            <thead className="bg-surface-muted text-[12px] text-ink-muted">
              <tr>
                <th className="px-4 py-2 text-start font-medium">{p.columns.feature}</th>
                <th className="px-4 py-2 text-start font-medium">{p.columns.sent}</th>
                <th className="px-4 py-2 text-start font-medium">{p.columns.provider}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {Object.entries(p.features).map(([key, feature]) => (
                <tr key={key} className="align-top">
                  <td className="px-4 py-3 font-medium">{feature.name}</td>
                  <td className="px-4 py-3 text-ink-soft">{feature.sent}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-ink-muted">{p.providers[providers[key]]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-[13px] text-ink-muted">{p.providersNote}</p>
      </Section>

      <Section title={p.neverSentTitle}>
        <List items={p.neverSent} />
      </Section>

      <Section title={p.storedTitle}>
        <p>{p.stored}</p>
        <p>{p.notStored}</p>
      </Section>

      <Section title={p.accessTitle}>
        <List items={p.access} />
      </Section>

      <Section title={p.controlsTitle}>
        <List items={p.controls} />
      </Section>
    </div>
  );
}

function Section({ id, title, children }: { id?: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-6 space-y-3 text-[14px] leading-relaxed">
      <h2 className="font-serif text-[21px] leading-tight font-medium">{title}</h2>
      {children}
    </section>
  );
}

function List({ items }: { items: string[] }) {
  return (
    <ul className="list-disc space-y-1.5 ps-5 text-ink-soft">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}
