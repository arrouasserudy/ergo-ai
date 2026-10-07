import clsx from "clsx";
import { CalendarClock, CircleCheck, ClipboardList, FileText, Gauge, Pencil, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { UpcomingEvents } from "@/components/child-events/UpcomingEvents";
import { OpenEpisodes } from "@/components/episodes/OpenEpisodes";
import { TimelineView } from "@/components/timeline/TimelineView";
import { Card, CardHeader } from "@/components/ui/Card";
import { TagList } from "@/components/ui/TagList";
import { isolate } from "@/i18n";
import { getI18n } from "@/i18n/server";
import { progress } from "@/lib/assessments/answers";
import { listChildAssessments } from "@/lib/assessments/queries";
import { getDefinition } from "@/lib/assessments/registry";
import { needsAttention, type AttentionItem } from "@/lib/child-attention";
import { upcomingEvents } from "@/lib/child-events/events";
import { listEvents, reportOptions } from "@/lib/child-events/queries";
import { getChild } from "@/lib/children";
import { listChildEpisodes } from "@/lib/episodes";
import { listChildForms } from "@/lib/forms/queries";
import { listReports } from "@/lib/reports/queries";
import { requireTherapist } from "@/lib/session";
import { localToday } from "@/lib/time";
import { childTimeline } from "@/lib/timeline/queries";

export async function generateMetadata(props: PageProps<"/children/[id]">) {
  const i18n = await getI18n();
  const { t } = i18n;
  const { accountId } = await requireTherapist();
  const child = getChild(accountId, (await props.params).id);
  return { title: `${child ? isolate(i18n.childName(child)) : t.children.listTitle} · ${t.app.name}` };
}

/** Overview tab: what needs attention, the latest events and the practical bits of the profile. */
export default async function ChildOverviewPage(props: PageProps<"/children/[id]">) {
  const i18n = await getI18n();
  const { t } = i18n;
  const o = t.children.overview;
  const { accountId, account } = await requireTherapist();
  const { id } = await props.params;
  const child = getChild(accountId, id);
  if (!child) notFound();

  const today = localToday();
  const openEpisodes = account.crisesEnabled ? listChildEpisodes(accountId, child.id).filter((ep) => ep.status === "open") : [];
  const assessments = listChildAssessments(accountId, child.id);
  const attention = needsAttention({
    forms: listChildForms(accountId, child.id),
    reports: listReports(accountId, { childId: child.id, status: "draft" }).map(({ report }) => report),
    assessments,
    today,
    warnDays: account.deadlineWarnDays,
  });
  const answersOf = new Map(assessments.map((a) => [a.id, a.answers]));
  const latestEvents = childTimeline(accountId, child, { episodes: account.crisesEnabled }).slice(-5).reverse();
  const events = listEvents(accountId, { childId: child.id, today, warnDays: account.deadlineWarnDays });
  const upcoming = upcomingEvents(events, today);
  const eventParam = (await props.searchParams).event;
  const linked = (typeof eventParam === "string" && events.find((e) => e.id === eventParam)) || null;

  const f = t.fields;
  const glance: { label: string; value: ReactNode }[] = [
    { label: f.knownTriggers, value: child.knownTriggers },
    { label: f.calmingStrategies, value: child.calmingStrategies.length > 0 && <TagList values={child.calmingStrategies} /> },
    { label: f.warningSigns, value: child.warningSigns },
    { label: f.hyperSensitivities, value: child.hyperSensitivities.length > 0 && <TagList values={child.hyperSensitivities} /> },
    { label: f.hypoReactivities, value: child.hypoReactivities.length > 0 && <TagList values={child.hypoReactivities} /> },
    { label: f.interests, value: child.interests.length > 0 && <TagList values={child.interests} /> },
  ].filter((item) => Boolean(item.value));

  return (
    <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
      <div className="min-w-0 space-y-5">
        {openEpisodes.length === 0 && attention.length === 0 ? (
          <p className="flex items-center gap-2 rounded-xl border border-line bg-surface px-4 py-3 text-[13px] text-ink-muted">
            <CircleCheck className="size-4 shrink-0 text-primary" strokeWidth={1.75} />
            {o.nothingPending}
          </p>
        ) : (
          <Card>
            <CardHeader title={o.attentionTitle} hint={o.attentionHint} />
            {openEpisodes.length > 0 && (
              <div className={clsx("px-5", attention.length === 0 && "pb-5")}>
                <OpenEpisodes items={openEpisodes.map((episode) => ({ episode, child }))} />
              </div>
            )}
            {attention.length > 0 && (
              <ul className={clsx("divide-y divide-line border-t border-line", openEpisodes.length > 0 && "mt-4")}>
                {attention.map((item) => (
                  <AttentionRow key={`${item.kind}-${item.id}`} item={item} childId={child.id} answersOf={answersOf} />
                ))}
              </ul>
            )}
          </Card>
        )}

        <UpcomingEvents
          childId={child.id}
          events={upcoming}
          reports={reportOptions(accountId, child.id)}
          today={today}
          linked={linked}
          canAdd={child.status !== "archived"}
        />

        <Card>
          <CardHeader title={o.recentTitle} hint={o.recentHint} />
          <div className="px-5 pb-2">
            <TimelineView events={latestEvents} birthDate={child.birthDate} preview />
          </div>
          <div className="border-t border-line px-5">
            <Link href={`/children/${child.id}/timeline`} className="inline-block py-3 text-[12.5px] font-medium text-primary hover:underline">
              {t.timeline.seeAll}
            </Link>
          </div>
        </Card>
      </div>

      <Card className="min-w-0">
        <CardHeader title={o.glanceTitle} hint={o.glanceHint} />
        <div className="px-5 pb-5">
          {glance.length === 0 ? (
            <p className="text-[13px] text-ink-muted">{o.glanceEmpty}</p>
          ) : (
            <dl className="space-y-4">
              {glance.map(({ label, value }) => (
                <div key={label}>
                  <dt className="text-[11.5px] font-medium text-ink-muted">{label}</dt>
                  <dd dir="auto" className="mt-1 text-[14px] leading-relaxed whitespace-pre-line text-ink">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </div>
        <Link
          href={`/children/${child.id}/profile`}
          className="flex items-center gap-1.5 border-t border-line px-5 py-3 text-[12.5px] font-medium text-primary hover:underline"
        >
          <Pencil className="size-3.5" />
          {o.editInProfile}
        </Link>
      </Card>
    </div>
  );
}

async function AttentionRow({
  item,
  childId,
  answersOf,
}: {
  item: AttentionItem;
  childId: string;
  answersOf: Map<string, Parameters<typeof progress>[1]>;
}) {
  const i18n = await getI18n();
  const { t } = i18n;
  if (item.kind === "form") {
    const late = item.level === "overdue";
    return (
      <Row href={`/children/${childId}/forms/${item.id}`} icon={ClipboardList} title={<bdi>{item.title}</bdi>}>
        <span className={clsx("inline-flex items-center gap-1 font-medium", late ? "text-danger" : "text-warn-ink")}>
          <CalendarClock className="size-3.5" />
          {(late ? t.forms.due.overdue : t.forms.due.before)(i18n.date(item.dueDate))}
        </span>
      </Row>
    );
  }
  if (item.kind === "report") {
    return (
      <Row href={`/reports/${item.id}`} icon={FileText} title={t.children.overview.draftReport}>
        {t.reports.docType[item.docType]} · {i18n.date(item.sessionDate)}
      </Row>
    );
  }
  const definition = getDefinition(item.definitionId);
  const answers = answersOf.get(item.id);
  const done = definition && answers && progress(definition, answers);
  return (
    <Row href={`/children/${childId}/assessments/${item.id}`} icon={Gauge} title={<bdi>{definition?.shortName ?? item.definitionId}</bdi>}>
      {t.children.overview.unfinishedTest} · {i18n.date(item.testDate)}
      {done && ` · ${t.assessments.progress(done.answered, done.total)}`}
    </Row>
  );
}

function Row({ href, icon: Icon, title, children }: { href: string; icon: LucideIcon; title: ReactNode; children: ReactNode }) {
  return (
    <li>
      <Link href={href} className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-surface-muted">
        <Icon className="size-4 shrink-0 text-ink-muted" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[14px] font-medium">{title}</span>
          <span className="block text-[12px] text-ink-muted">{children}</span>
        </span>
      </Link>
    </li>
  );
}
