import clsx from "clsx";
import { Activity, Building2, ChevronRight, EyeOff, UserRound } from "lucide-react";
import Link from "next/link";
import { UsageRows } from "@/components/analytics/UsageRows";
import { StatTile } from "@/components/dashboard/StatTile";
import { Card, CardHeader } from "@/components/ui/Card";
import { getI18n } from "@/i18n/server";
import type { Dictionary } from "@/i18n/fr";
import { activeTotals, therapistActivity, usageCounts, type UsageFilters } from "@/lib/analytics/queries";
import { parsePeriod, summarizeUsage, USAGE_PERIODS } from "@/lib/analytics/summary";
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

/** Internal analytics (admins only, ADMIN_EMAILS): what is used and what is not. */
export default async function UsagePage(props: PageProps<"/admin/usage">) {
  await requireAdmin();
  const i18n = await getI18n();
  const u = i18n.t.usage;
  const sp = await props.searchParams;
  const filters: UsageFilters = { days: parsePeriod(sp.days), includeDemo: sp.demo === "1", includeAdmins: sp.admins === "1" };

  const summary = summarizeUsage(usageCounts(filters));
  const totals = activeTotals(filters);
  const people = therapistActivity(filters);

  const href = (next: Partial<UsageFilters>) => {
    const f = { ...filters, ...next };
    const query = new URLSearchParams({ days: String(f.days) });
    if (f.includeDemo) query.set("demo", "1");
    if (f.includeAdmins) query.set("admins", "1");
    return `/admin/usage?${query}`;
  };
  const areaLabel = (area: string) => u.areas[area as keyof Dictionary["usage"]["areas"]] ?? area;

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <header>
        <h1 className="text-[28px] leading-tight font-semibold tracking-tight">{u.title}</h1>
        <p className="mt-1 max-w-2xl text-[13px] text-ink-muted">{u.subtitle}</p>
      </header>

      <nav className="flex flex-wrap gap-2">
        {USAGE_PERIODS.map((days) => (
          <Link key={days} href={href({ days })} className={chip(filters.days === days)} aria-current={filters.days === days ? "page" : undefined}>
            {u.period(days)}
          </Link>
        ))}
        <span className="mx-1 w-px self-stretch bg-line" aria-hidden />
        <Link href={href({ includeDemo: !filters.includeDemo })} className={chip(filters.includeDemo)} aria-pressed={filters.includeDemo}>
          {u.includeDemo}
        </Link>
        <Link href={href({ includeAdmins: !filters.includeAdmins })} className={chip(filters.includeAdmins)} aria-pressed={filters.includeAdmins}>
          {u.includeAdmins}
        </Link>
      </nav>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile href="#people" label={u.stats.therapists} value={totals.therapists} hint={u.period(filters.days)} icon={UserRound} />
        <StatTile href="#features" label={u.stats.cabinets} value={totals.cabinets} hint={u.period(filters.days)} icon={Building2} />
        <StatTile href="#pages" label={u.stats.uses} value={totals.uses} hint={u.period(filters.days)} icon={Activity} />
        <StatTile
          href="#unused"
          label={u.stats.unused}
          value={summary.unusedEvents.length}
          hint={u.stats.unusedHint(summary.unusedPages.length)}
          icon={EyeOff}
          tone={summary.unusedEvents.length ? "warn" : "tint"}
        />
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Card id="features" className="pb-2">
          <CardHeader title={u.features} hint={u.featuresHint} />
          <div className="space-y-4">
            {summary.areas.map((area) => (
              <section key={area.area}>
                <h3 className="flex items-baseline justify-between gap-3 bg-surface-muted px-5 py-1.5 text-[12.5px] font-semibold text-ink-soft">
                  <span>{areaLabel(area.area)}</span>
                  <span className="tabular-nums">{area.uses}</span>
                </h3>
                <UsageRows rows={area.rows} i18n={i18n} />
              </section>
            ))}
          </div>
        </Card>

        <div className="space-y-5">
          <Card id="people" className="pb-2">
            <CardHeader title={u.people} hint={u.peopleHint} />
            {people.length === 0 ? (
              <p className="px-5 pb-3 text-[13px] text-ink-muted">{u.peopleEmpty}</p>
            ) : (
              <ul className="divide-y divide-line">
                {people.map((person) => (
                  <li key={person.id}>
                    <Link href={`/admin/usage/${person.id}?days=${filters.days}`} className="flex items-center gap-3 px-5 py-2.5 transition-colors hover:bg-surface-muted">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[14px] font-medium">{person.name}</span>
                        <span className="block truncate text-[12px] text-ink-muted">
                          <bdi>{person.email}</bdi> · <bdi>{person.cabinet}</bdi>
                        </span>
                      </span>
                      <span className="shrink-0 text-end">
                        <span className="block text-[14px] font-semibold tabular-nums">{person.uses}</span>
                        <span className="block text-[11.5px] text-ink-muted">{person.lastAt ? i18n.dateTime(person.lastAt) : ""}</span>
                      </span>
                      <ChevronRight className="size-4 shrink-0 text-ink-muted rtl:rotate-180" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card id="unused" className="pb-5">
            <CardHeader title={u.unusedTitle} />
            {summary.unusedEvents.length + summary.unusedPages.length === 0 ? (
              <p className="px-5 text-[13px] text-ink-muted">{u.unusedNone}</p>
            ) : (
              <div className="space-y-3 px-5">
                {[
                  { title: u.features, names: summary.unusedEvents },
                  { title: u.pages, names: summary.unusedPages },
                ]
                  .filter((group) => group.names.length)
                  .map((group) => (
                    <div key={group.title}>
                      <p className="text-[12px] font-medium text-ink-muted">{group.title}</p>
                      <ul className="mt-1.5 flex flex-wrap gap-1.5">
                        {group.names.map((name) => (
                          <li key={name}>
                            <code dir="ltr" className="inline-block rounded-lg bg-surface-muted px-2 py-0.5 text-[12px]">
                              {name}
                            </code>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
              </div>
            )}
          </Card>

          <Card id="pages" className="pb-2">
            <CardHeader title={u.pages} hint={u.pagesHint} />
            <UsageRows rows={summary.pages} i18n={i18n} />
          </Card>

          {summary.retired.length > 0 && (
            <Card className="pb-2">
              <CardHeader title={u.retired} />
              <UsageRows rows={summary.retired.map((r) => ({ ...r, share: 0 }))} i18n={i18n} />
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
