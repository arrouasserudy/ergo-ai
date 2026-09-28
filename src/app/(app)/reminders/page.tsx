import { CalendarPlus, Info } from "lucide-react";
import Link from "next/link";
import { MeetingRow } from "@/components/meetings/MeetingRow";
import { MilestoneList } from "@/components/reminders/MilestoneList";
import { Avatar } from "@/components/ui/Avatar";
import { buttonClass } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { getI18n } from "@/i18n/server";
import { listScheduledMeetings } from "@/lib/meetings";
import { meetingView } from "@/lib/meetings/view";
import { accountMilestones } from "@/lib/reminders";
import { needsAction, schoolYearOf } from "@/lib/reminders/milestones";
import { requireTherapist } from "@/lib/session";
import { smsProvider } from "@/lib/sms";
import { localDate } from "@/lib/time";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: `${t.nav.reminders} · ${t.app.name}` };
}

const DAY = 24 * 60 * 60 * 1000;
const STATE_ORDER = { overdue: 0, dueSoon: 1, later: 2, done: 3 };

export default async function RemindersPage() {
  const i18n = await getI18n();
  const { t } = i18n;
  const r = t.reminders;
  const { account, accountId } = await requireTherapist();
  const now = new Date();
  const smsAuto = smsProvider() !== null;

  const perChild = accountMilestones(account, now);
  const todo = perChild
    .flatMap(({ child, milestones }) => milestones.filter(needsAction).map((status) => ({ child, status })))
    .sort((a, b) => STATE_ORDER[a.status.state] - STATE_ORDER[b.status.state] || a.status.dueDate.localeCompare(b.status.dueDate));
  const withoutGuidance = perChild.filter(({ milestones }) =>
    milestones.some((s) => s.milestone === "parentGuidance" && s.state !== "done" && !s.plannedOn),
  );

  const upcoming = listScheduledMeetings(accountId, now, new Date(now.getTime() + 14 * DAY)).map((item) => meetingView(item, account.name));
  // Still "scheduled" an hour after their start: most likely over, waiting to be marked done or cancelled.
  const toCloseViews = listScheduledMeetings(accountId, new Date(0), new Date(now.getTime() - 60 * 60 * 1000)).map((item) => meetingView(item, account.name));

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <header>
        <Eyebrow>{r.eyebrow}</Eyebrow>
        <h1 className="mt-1 font-serif text-[32px] leading-tight font-medium">{r.title}</h1>
        <p className="mt-1 text-[13px] text-ink-muted">{r.subtitle(schoolYearOf(localDate(now)))}</p>
      </header>

      {toCloseViews.length > 0 && (
        <Card className="border-warn-ink/30">
          <CardHeader title={r.toCloseTitle} hint={r.toCloseHint} />
          <ul className="divide-y divide-line border-t border-line">
            {toCloseViews.map((v) => (
              <li key={v.meeting.id}>
                <MeetingRow view={v} showChild smsAuto={smsAuto} />
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="grid items-start gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader title={r.todoTitle} hint={r.todoHint} />
          {todo.length === 0 ? <p className="px-5 pb-5 text-[13px] text-ink-muted">{r.todoEmpty}</p> : <MilestoneList rows={todo} showChild />}
        </Card>

        <Card>
          <CardHeader title={r.upcomingTitle} />
          {!smsAuto && upcoming.length > 0 && (
            <p className="mx-5 mb-3 flex gap-2 rounded-lg bg-surface-muted px-3 py-2 text-[12.5px] text-ink-muted">
              <Info className="mt-0.5 size-3.5 shrink-0" />
              {r.smsOff}
            </p>
          )}
          {upcoming.length === 0 ? (
            <p className="px-5 pb-5 text-[13px] text-ink-muted">{r.upcomingEmpty}</p>
          ) : (
            <ul className="divide-y divide-line border-t border-line">
              {upcoming.map((v) => (
                <li key={v.meeting.id}>
                  <MeetingRow view={v} showChild smsAuto={smsAuto} />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card>
        <CardHeader title={r.guidanceTitle} hint={r.guidanceHint} />
        {withoutGuidance.length === 0 ? (
          <p className="px-5 pb-5 text-[13px] text-ink-muted">{r.guidanceEmpty}</p>
        ) : (
          <ul className="divide-y divide-line border-t border-line">
            {withoutGuidance.map(({ child, milestones }) => {
              const status = milestones.find((s) => s.milestone === "parentGuidance")!;
              return (
                <li key={child.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                  <Avatar name={child.name} />
                  <div className="min-w-0 flex-1">
                    <Link href={`/children/${child.id}`} className="text-[14px] font-medium hover:underline">
                      <bdi>{i18n.childName(child)}</bdi>
                    </Link>
                    <p className={status.state === "overdue" ? "text-[12.5px] text-warn-ink" : "text-[12.5px] text-ink-muted"}>
                      {status.state === "overdue" ? r.overdueSince(i18n.date(status.dueDate)) : r.due(i18n.date(status.dueDate))}
                    </p>
                  </div>
                  <Link href={`/children/${child.id}?plan=parent_guidance#meetings`} className={buttonClass("secondary", "sm")}>
                    <CalendarPlus className="size-3.5" />
                    {r.plan}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
