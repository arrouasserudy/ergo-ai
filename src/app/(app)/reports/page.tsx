import { FileText, Plus } from "lucide-react";
import { ReportFilters } from "@/components/reports/ReportFilters";
import { ReportRows } from "@/components/reports/ReportRows";
import { LinkButton } from "@/components/ui/Button";
import { REPORT_STATUSES } from "@/db/schema";
import { getI18n } from "@/i18n/server";
import { listReports, type ReportStatusFilter } from "@/lib/reports/queries";
import { requireTherapist } from "@/lib/session";
import { APP_TIME_ZONE } from "@/lib/time";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: `${t.reports.listTitle} · ${t.app.name}` };
}

function parseStatus(value: unknown): ReportStatusFilter {
  return (REPORT_STATUSES as readonly unknown[]).includes(value) ? (value as ReportStatusFilter) : "all";
}

export default async function ReportsPage(props: PageProps<"/reports">) {
  const { t } = await getI18n();
  const r = t.reports;
  const { accountId } = await requireTherapist();
  const sp = await props.searchParams;
  const search = typeof sp.q === "string" ? sp.q : "";
  const status = parseStatus(sp.status);
  const thisMonth = sp.month === "1";
  const childId = typeof sp.child === "string" ? sp.child : undefined;
  const monthStart = `${new Date().toLocaleDateString("en-CA", { timeZone: APP_TIME_ZONE }).slice(0, 7)}-01`;
  const rows = listReports(accountId, { search, status, childId, fromDate: thisMonth ? monthStart : undefined });
  const isFiltered = search !== "" || status !== "all" || thisMonth || childId !== undefined;

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[28px] leading-tight font-semibold tracking-tight">{r.listTitle}</h1>
          <p className="mt-1 text-[13px] text-ink-muted">{r.listSubtitle}</p>
        </div>
        <LinkButton href="/reports/new">
          <Plus className="size-4" />
          {r.newButton}
        </LinkButton>
      </header>

      <ReportFilters search={search} status={status} thisMonth={thisMonth} />

      <section className="overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
        {rows.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
            <span className="grid size-12 place-items-center rounded-full bg-tint text-tint-ink">
              <FileText className="size-5" />
            </span>
            {isFiltered ? (
              <p className="text-ink-muted">{r.noResults}</p>
            ) : (
              <>
                <p className="text-[16px] font-semibold">{r.emptyTitle}</p>
                <p className="max-w-md text-[13px] text-ink-muted">{r.emptyBody}</p>
                <LinkButton href="/reports/new" className="mt-2">
                  <Plus className="size-4" />
                  {r.newButton}
                </LinkButton>
              </>
            )}
          </div>
        ) : (
          <ReportRows rows={rows} />
        )}
      </section>
      {rows.length > 0 && <p className="text-[12px] text-ink-muted">{r.count(rows.length)}</p>}
    </div>
  );
}
