import clsx from "clsx";
import { Activity, CalendarClock, FileText, UserRound } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChildrenTabs } from "@/components/children/ChildrenTabs";
import { StatTile } from "@/components/dashboard/StatTile";
import { GroupDot } from "@/components/groups/GroupBadge";
import { GroupHeaderActions } from "@/components/groups/GroupHeaderActions";
import { Avatar } from "@/components/ui/Avatar";
import { BackLink } from "@/components/ui/BackLink";
import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader } from "@/components/ui/Card";
import { isolate } from "@/i18n";
import { getI18n } from "@/i18n/server";
import { listChildren } from "@/lib/children";
import { attentionRank, totalsOf, type ChildSummary } from "@/lib/groups/overview";
import { childSummaries, getGroup, listGroups } from "@/lib/groups/queries";
import { requireTherapist } from "@/lib/session";
import { localToday } from "@/lib/time";

export async function generateMetadata(props: PageProps<"/groups/[id]">) {
  const { t } = await getI18n();
  const { accountId } = await requireTherapist();
  const group = getGroup(accountId, (await props.params).id);
  return { title: `${group ? isolate(group.name) : t.groups.title} · ${t.app.name}` };
}

/** One group's overview: its figures over 30 days and its children, most urgent first. Counting only, no AI. */
export default async function GroupPage(props: PageProps<"/groups/[id]">) {
  const i18n = await getI18n();
  const { t } = i18n;
  const g = t.groups;
  const { account, accountId } = await requireTherapist();
  const { id } = await props.params;
  const group = getGroup(accountId, id);
  if (!group) notFound();
  const sp = await props.searchParams;

  const rows = childSummaries(account, { groupId: group.id }).sort((a, b) => attentionRank(b.summary) - attentionRank(a.summary));
  const totals = totalsOf(rows.map((r) => r.summary));
  const groupNames = new Map(listGroups(accountId).map((other) => [other.id, other.name]));
  const options = listChildren(accountId, { status: "active" })
    .map((c) => ({ id: c.id, name: c.name, label: i18n.childName(c), groupId: c.groupId, groupName: c.groupId ? (groupNames.get(c.groupId) ?? null) : null }))
    .sort((a, b) => Number(b.groupId === group.id) - Number(a.groupId === group.id) || a.label.localeCompare(b.label, i18n.locale));
  const formsDue = totals.formsOverdue + totals.formsSoon;

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <ChildrenTabs />
      <header className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
        <div className="min-w-0 flex-1 basis-72">
          <BackLink href="/groups">{g.backToGroups}</BackLink>
          <div className="mt-1 flex items-center gap-3">
            <GroupDot color={group.color} className="size-3.5" />
            <h1 className="truncate text-[26px] leading-tight font-semibold tracking-tight">
              <bdi>{group.name}</bdi>
            </h1>
          </div>
          <p className="mt-1 text-[13px] text-ink-muted">
            {group.place && (
              <>
                <bdi>{group.place}</bdi>
                {" · "}
              </>
            )}
            {g.childrenCount(totals.children)}
          </p>
        </div>
        <GroupHeaderActions group={group} options={options} openMembers={sp.members === "1" && rows.length === 0} />
      </header>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatTile href={`/children?group=${group.id}`} label={g.stats.children} value={totals.children} hint={g.stats.childrenHint(totals.childrenWithCrises)} icon={UserRound} />
        <StatTile
          href="#children"
          label={g.stats.crises}
          value={totals.crises}
          hint={g.stats.crisesHint(totals.previousCrises)}
          icon={Activity}
          tone={totals.crises > 0 ? "warn" : "tint"}
        />
        <StatTile
          href="#children"
          label={g.stats.forms}
          value={formsDue}
          hint={g.stats.formsHint(totals.formsOverdue)}
          icon={CalendarClock}
          tone={totals.formsOverdue > 0 ? "danger" : formsDue > 0 ? "warn" : "tint"}
        />
        <StatTile href="/reports?status=draft" label={g.stats.drafts} value={totals.drafts} hint={g.stats.draftsHint} icon={FileText} />
      </div>

      <Card id="children">
        <CardHeader title={g.childrenTitle} hint={g.childrenHint} />
        {rows.length === 0 ? (
          <p className="px-5 pb-8 pt-2 text-center text-[13px] text-ink-muted">{g.noChildren}</p>
        ) : (
          <>
            <div className="hidden grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.6fr)_minmax(0,1.2fr)] gap-4 border-y border-line bg-surface-muted px-5 py-2.5 text-[10.5px] font-medium tracking-[0.12em] text-ink-muted uppercase md:grid">
              <span>{g.columns.child}</span>
              <span>{g.columns.crises}</span>
              <span>{g.columns.forms}</span>
              <span>{g.columns.drafts}</span>
              <span>{g.columns.next}</span>
            </div>
            <ul className="divide-y divide-line border-t border-line md:border-t-0">
              {rows.map(({ child, summary }) => (
                <li key={child.id}>
                  <Link
                    href={`/children/${child.id}`}
                    className="grid grid-cols-2 items-center gap-x-4 gap-y-2 px-5 py-3.5 transition-colors hover:bg-surface-muted md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.6fr)_minmax(0,1.2fr)]"
                  >
                    <span className="col-span-2 flex items-center gap-3 md:col-span-1">
                      <Avatar name={child.name} />
                      <span className="min-w-0">
                        <bdi className="block truncate text-[14px] font-medium">{i18n.childName(child)}</bdi>
                        <span dir="auto" className="block truncate text-[11.5px] text-ink-muted">
                          {[i18n.age(child.birthDate), child.schoolLevel].filter(Boolean).join(" · ") || "—"}
                        </span>
                      </span>
                    </span>
                    <Crises summary={summary} />
                    <span className="flex flex-wrap gap-1.5">
                      {summary.formsOverdue > 0 && <Badge tone="danger">{g.overdueCount(summary.formsOverdue)}</Badge>}
                      {summary.formsSoon > 0 && <Badge tone="warn">{g.soonCount(summary.formsSoon)}</Badge>}
                      {summary.formsOverdue + summary.formsSoon === 0 && <span className="text-[13px] text-ink-muted">—</span>}
                    </span>
                    <span className={clsx("text-[13px] tabular-nums", summary.drafts ? "text-ink" : "text-ink-muted")}>
                      <span className="text-ink-muted md:hidden">{g.columns.drafts} · </span>
                      {summary.drafts || "—"}
                    </span>
                    <span className="min-w-0 text-[13px] text-ink-soft">
                      {summary.nextEvent ? (
                        <>
                          <span className="block truncate">
                            {summary.nextEvent.kind === "other" && summary.nextEvent.details ? (
                              <bdi>{summary.nextEvent.details}</bdi>
                            ) : (
                              t.childEvents.kind[summary.nextEvent.kind]
                            )}
                          </span>
                          <span className="block text-[11.5px] text-ink-muted">
                            {i18n.date(summary.nextEvent.date)}
                            {summary.nextEvent.time && ` · ${summary.nextEvent.time}`}
                          </span>
                        </>
                      ) : (
                        <span className="text-ink-muted">—</span>
                      )}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>
    </div>
  );
}

async function Crises({ summary }: { summary: ChildSummary }) {
  const i18n = await getI18n();
  const g = i18n.t.groups;
  if (summary.crises === 0) {
    return (
      <span className="text-[13px] text-ink-muted">
        <span className="md:hidden">{g.columns.crises} · </span>0
      </span>
    );
  }
  return (
    <span className="text-[13px]">
      <span className="font-semibold text-warn-ink tabular-nums">
        <span className="font-normal text-ink-muted md:hidden">{g.columns.crises} · </span>
        {summary.crises}
      </span>
      {summary.lastCrisisAt && <span className="block text-[11.5px] text-ink-muted">{g.lastCrisis(i18n.date(localToday(summary.lastCrisisAt)))}</span>}
    </span>
  );
}
