import clsx from "clsx";
import { FileText, MousePointerClick } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BackLink } from "@/components/ui/BackLink";
import { Card } from "@/components/ui/Card";
import { getI18n } from "@/i18n/server";
import { getTherapistWithCabinet, therapistEvents, TIMELINE_LIMIT } from "@/lib/analytics/queries";
import { parsePeriod, USAGE_PERIODS } from "@/lib/analytics/summary";
import { timelineSessions } from "@/lib/analytics/timeline";
import { requireAdmin } from "@/lib/session";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: `${t.usage.title} · ${t.app.name}` };
}

const chip = (active: boolean) =>
  clsx(
    "inline-flex h-9 items-center rounded-full border px-3.5 text-[13px] font-medium transition-colors",
    active ? "border-primary bg-tint text-tint-ink" : "border-line-strong bg-surface text-ink-soft hover:bg-surface-muted",
  );

/** One therapist's path through the app (admins only): pages and actions, by session. */
export default async function UsageTimelinePage(props: PageProps<"/admin/usage/[therapistId]">) {
  await requireAdmin();
  const i18n = await getI18n();
  const u = i18n.t.usage;
  const { therapistId } = await props.params;
  const days = parsePeriod((await props.searchParams).days);
  const person = getTherapistWithCabinet(therapistId);
  if (!person) notFound();

  const events = therapistEvents(therapistId, days);
  const sessions = timelineSessions(events);

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <BackLink href={`/admin/usage?days=${days}`}>{u.timeline.back}</BackLink>
      <header>
        <h1 className="text-[28px] leading-tight font-semibold tracking-tight">{person.name}</h1>
        <p className="mt-1 text-[13px] text-ink-muted">
          <bdi>{person.email}</bdi> · <bdi>{person.cabinet}</bdi>
        </p>
        <p className="mt-2 max-w-2xl text-[13px] text-ink-muted">{u.timeline.hint}</p>
      </header>

      <nav className="flex flex-wrap gap-2">
        {USAGE_PERIODS.map((period) => (
          <Link key={period} href={`/admin/usage/${therapistId}?days=${period}`} className={chip(days === period)} aria-current={days === period ? "page" : undefined}>
            {u.period(period)}
          </Link>
        ))}
      </nav>

      {events.length >= TIMELINE_LIMIT && <p className="text-[12.5px] text-warn-ink">{u.timeline.limited(TIMELINE_LIMIT)}</p>}

      {sessions.length === 0 ? (
        <Card className="px-5 py-10 text-center text-[13px] text-ink-muted">{u.timeline.empty}</Card>
      ) : (
        sessions.map((session) => (
          <Card key={session.start.getTime()} className="pb-2">
            <header className="flex flex-wrap items-baseline justify-between gap-2 px-5 pt-4 pb-2">
              <h2 className="text-[15px] font-semibold">
                {i18n.longDate(session.start)} · <span dir="ltr">{i18n.time(session.start)}–{i18n.time(session.end)}</span>
              </h2>
              <span className="text-[12.5px] text-ink-muted">{u.timeline.session(session.uses)}</span>
            </header>
            <ol className="relative ms-5 border-s border-line pe-5">
              {session.steps.map((step, i) => {
                const Icon = step.kind === "page" ? FileText : MousePointerClick;
                return (
                  <li key={i} className="relative flex items-start gap-3 py-1.5 ps-5">
                    <span
                      className={clsx(
                        "absolute -start-[9px] top-2 grid size-[18px] place-items-center rounded-full ring-4 ring-surface",
                        step.kind === "page" ? "bg-surface-muted text-ink-muted" : "bg-tint text-tint-ink",
                      )}
                    >
                      <Icon className="size-2.5" strokeWidth={2.25} />
                    </span>
                    <span dir="ltr" className="w-11 shrink-0 pt-px text-[12px] text-ink-muted tabular-nums">
                      {i18n.time(step.createdAt)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <code dir="ltr" className={clsx("text-[13px] break-all", step.kind === "event" && "font-semibold")}>
                        {step.name}
                      </code>
                      {step.count > 1 && <span className="ms-2 text-[12px] text-ink-muted tabular-nums">×{step.count}</span>}
                      {step.props && (
                        <span dir="ltr" className="mt-0.5 block text-[12px] text-ink-muted">
                          {Object.entries(step.props)
                            .map(([key, value]) => `${key}=${value}`)
                            .join(" · ")}
                        </span>
                      )}
                    </span>
                  </li>
                );
              })}
            </ol>
          </Card>
        ))
      )}
    </div>
  );
}
