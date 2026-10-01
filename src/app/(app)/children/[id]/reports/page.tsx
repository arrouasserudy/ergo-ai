import { Plus } from "lucide-react";
import { notFound } from "next/navigation";
import { ReportRows } from "@/components/reports/ReportRows";
import { LinkButton } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { isolate } from "@/i18n";
import { getI18n } from "@/i18n/server";
import { getChild } from "@/lib/children";
import { listReports } from "@/lib/reports/queries";
import { requireTherapist } from "@/lib/session";

export async function generateMetadata(props: PageProps<"/children/[id]/reports">) {
  const i18n = await getI18n();
  const { t } = i18n;
  const { accountId } = await requireTherapist();
  const child = getChild(accountId, (await props.params).id);
  return { title: `${t.children.tabs.reports} · ${child ? isolate(i18n.childName(child)) : ""} · ${t.app.name}` };
}

/** Reports tab: every report of the child, newest first. */
export default async function ChildReportsPage(props: PageProps<"/children/[id]/reports">) {
  const { t } = await getI18n();
  const { accountId } = await requireTherapist();
  const { id } = await props.params;
  const child = getChild(accountId, id);
  if (!child) notFound();

  const reports = listReports(accountId, { childId: child.id });

  return (
    <Card>
      <CardHeader
        title={t.reports.childCardTitle}
        hint={t.reports.childCardHint}
        action={
          child.status !== "archived" && (
            <LinkButton href={`/reports/new?child=${child.id}`} size="sm">
              <Plus className="size-3.5" />
              {t.reports.newButton}
            </LinkButton>
          )
        }
      />
      {reports.length === 0 ? (
        <p className="px-5 pb-5 text-[13px] text-ink-muted">{t.reports.childNone}</p>
      ) : (
        <div className="border-t border-line">
          <ReportRows rows={reports} showChild={false} />
        </div>
      )}
    </Card>
  );
}
