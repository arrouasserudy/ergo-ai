import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import type { Report } from "@/db/schema";
import { getI18n } from "@/i18n/server";
import { ReportStatusBadge } from "./ReportStatusBadge";

export type ReportRow = {
  report: Pick<Report, "id" | "docType" | "sessionDate" | "status">;
  child: { id: string; name: string; birthDate: string | null };
};

/** Table rows of reports, shared by the list page and the child page. */
export async function ReportRows({ rows, showChild = true }: { rows: ReportRow[]; showChild?: boolean }) {
  const i18n = await getI18n();
  const { t } = i18n;
  const r = t.reports;
  const grid = showChild ? "md:grid-cols-[1.2fr_1.6fr_1fr_0.8fr]" : "md:grid-cols-[1.6fr_1fr_0.8fr]";

  return (
    <>
      <div
        className={`hidden gap-4 border-b border-line bg-surface-muted px-5 py-3 text-[10.5px] font-medium tracking-[0.12em] text-ink-muted uppercase md:grid ${grid}`}
      >
        {showChild && <span>{r.columns.child}</span>}
        <span>{r.columns.type}</span>
        <span>{r.columns.date}</span>
        <span>{r.columns.status}</span>
      </div>
      <ul className="divide-y divide-line">
        {rows.map(({ report, child }) => (
          <li key={report.id}>
            <Link
              href={`/reports/${report.id}`}
              className={`grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 px-5 py-3.5 transition-colors hover:bg-surface-muted ${grid}`}
            >
              {showChild && (
                <span className="flex items-center gap-3">
                  <Avatar name={child.name} />
                  <span>
                    <bdi className="block text-[14px] font-medium">{i18n.childName(child)}</bdi>
                    <span className="block text-[11.5px] text-ink-muted">{i18n.age(child.birthDate) ?? "—"}</span>
                  </span>
                </span>
              )}
              <span className={showChild ? "col-start-1 ps-11 text-[13px] md:col-start-auto md:ps-0 md:text-[14px]" : "text-[14px]"}>
                {r.docType[report.docType]}
                <span className="text-ink-muted md:hidden"> · {i18n.date(report.sessionDate)}</span>
              </span>
              <span className="hidden text-[13px] text-ink-soft md:block">{i18n.date(report.sessionDate)}</span>
              <span className="col-start-2 row-start-1 md:col-start-auto md:row-start-auto">
                <ReportStatusBadge status={report.status} />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
