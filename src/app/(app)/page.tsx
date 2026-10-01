import clsx from "clsx";
import { Activity, CalendarClock, CircleCheck, ClipboardList, FileText, Inbox, Plus, UserRound } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { StatTile } from "@/components/dashboard/StatTile";
import { OpenEpisodes } from "@/components/episodes/OpenEpisodes";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { LinkButton } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { isolate } from "@/i18n";
import { getI18n } from "@/i18n/server";
import { take, type ActivityItem, type TodoItem } from "@/lib/dashboard/feed";
import { countActiveChildren, countRecentCrises, openEpisodes, recentActivity, todoList } from "@/lib/dashboard/queries";
import { pendingForms } from "@/lib/forms/queries";
import { requireTherapist } from "@/lib/session";
import { localToday } from "@/lib/time";

const LIST_LIMIT = 5;

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: `${t.dashboard.title} · ${t.app.name}` };
}

export default async function DashboardPage() {
  const i18n = await getI18n();
  const { t } = i18n;
  const d = t.dashboard;
  const { therapist, account, accountId } = await requireTherapist();

  const pending = pendingForms(accountId, localToday(), account.deadlineWarnDays);
  const overdue = pending.filter((f) => f.level === "overdue").length;
  const todo = todoList(accountId, pending);
  const todoShown = take(todo.items, LIST_LIMIT);
  const activity = take(recentActivity(accountId), LIST_LIMIT);
  const firstName = therapist.name.trim().split(/\s+/)[0] ?? "";

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[28px] leading-tight font-semibold tracking-tight">{d.greeting(isolate(firstName))}</h1>
          <p className="mt-1 text-[13px] text-ink-muted first-letter:uppercase">{i18n.longDate(new Date())}</p>
        </div>
        <LinkButton href="/reports/new">
          <Plus className="size-4" />
          {t.nav.newReport}
        </LinkButton>
      </header>

      <OpenEpisodes items={openEpisodes(accountId)} />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatTile href="/children" label={d.stats.children} value={countActiveChildren(accountId)} hint={d.stats.childrenHint} icon={UserRound} />
        <StatTile href="/reports?status=draft" label={d.stats.drafts} value={todo.drafts} hint={d.stats.draftsHint} icon={FileText} />
        <StatTile
          href="/children"
          label={d.stats.forms}
          value={pending.length}
          hint={d.stats.formsHint(overdue)}
          icon={CalendarClock}
          tone={overdue > 0 ? "danger" : pending.length > 0 ? "warn" : "tint"}
        />
        <StatTile href="/crises" label={d.stats.crises} value={countRecentCrises(accountId)} hint={d.stats.crisesHint} icon={Activity} />
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader title={d.todoTitle} hint={d.todoHint} />
          {todoShown.items.length === 0 ? (
            <Empty icon={CircleCheck}>{d.todoEmpty}</Empty>
          ) : (
            <Rows more={todoShown.more}>
              {todoShown.items.map((item) => (
                <TodoRow key={`${item.kind}-${item.id}`} item={item} />
              ))}
            </Rows>
          )}
        </Card>

        <Card>
          <CardHeader title={d.activityTitle} hint={d.activityHint} />
          {activity.items.length === 0 ? (
            <Empty icon={Inbox}>{d.activityEmpty}</Empty>
          ) : (
            <Rows more={0}>
              {activity.items.map((item) => (
                <ActivityRow key={`${item.kind}-${item.id}`} item={item} />
              ))}
            </Rows>
          )}
        </Card>
      </div>
    </div>
  );
}

function Empty({ icon: Icon, children }: { icon: typeof Inbox; children: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 px-5 pt-4 pb-8 text-center">
      <span className="grid size-10 place-items-center rounded-full bg-tint text-tint-ink">
        <Icon className="size-[18px]" strokeWidth={1.75} />
      </span>
      <p className="text-[13px] text-ink-muted">{children}</p>
    </div>
  );
}

async function Rows({ more, children }: { more: number; children: ReactNode }) {
  const { t } = await getI18n();
  return (
    <div className="border-t border-line">
      <ul className="divide-y divide-line">{children}</ul>
      {more > 0 && <p className="border-t border-line px-5 py-3 text-[12.5px] text-ink-muted">{t.dashboard.more(more)}</p>}
    </div>
  );
}

async function Row({ href, child, detail, aside }: { href: string; child: { id: string; name: string }; detail: ReactNode; aside: ReactNode }) {
  const i18n = await getI18n();
  return (
    <li>
      <Link href={href} className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-surface-muted">
        <Avatar name={child.name} />
        <span className="min-w-0 flex-1">
          <bdi className="block truncate text-[14px] font-medium">{i18n.childName(child)}</bdi>
          <span className="block truncate text-[12.5px] text-ink-soft">{detail}</span>
        </span>
        <span className="shrink-0">{aside}</span>
      </Link>
    </li>
  );
}

async function TodoRow({ item }: { item: TodoItem }) {
  const i18n = await getI18n();
  const { t } = i18n;
  if (item.kind === "form") {
    const late = item.level === "overdue";
    return (
      <Row
        href={`/children/${item.child.id}/forms/${item.id}`}
        child={item.child}
        detail={<bdi>{item.title}</bdi>}
        aside={
          <span className={clsx("flex items-center gap-1 text-[12px] font-medium", late ? "text-danger" : "text-warn-ink")}>
            <CalendarClock className="size-3.5" />
            {(late ? t.forms.due.overdue : t.forms.due.before)(i18n.dayMonth(item.dueDate.slice(5)))}
          </span>
        }
      />
    );
  }
  return (
    <Row
      href={`/reports/${item.id}`}
      child={item.child}
      detail={`${t.reports.docType[item.docType]} · ${i18n.date(item.sessionDate)}`}
      aside={<Badge tone="muted">{t.dashboard.draft}</Badge>}
    />
  );
}

async function ActivityRow({ item }: { item: ActivityItem }) {
  const i18n = await getI18n();
  const { t } = i18n;
  const a = t.dashboard.activity;
  const when = <span className="text-[12px] text-ink-muted">{i18n.shortDate(item.at)}</span>;
  if (item.kind === "episode") {
    return (
      <Row
        href={`/children/${item.child.id}/episodes/${item.id}`}
        child={item.child}
        detail={<Badge tone={item.episodeKind === "crisis" ? "warn" : "muted"}>{t.episodes.kind[item.episodeKind]}</Badge>}
        aside={when}
      />
    );
  }
  if (item.kind === "form") {
    return (
      <Row
        href={`/children/${item.child.id}/forms/${item.id}`}
        child={item.child}
        detail={
          <>
            <ClipboardList className="me-1 inline size-3.5 align-[-2px] text-ink-muted" />
            <bdi>{item.title}</bdi> · {item.byParent ? a.formByParent : a.form}
          </>
        }
        aside={when}
      />
    );
  }
  return (
    <Row
      href={`/children/${item.child.id}/assessments/${item.id}`}
      child={item.child}
      detail={
        <>
          <CircleCheck className="me-1 inline size-3.5 align-[-2px] text-ink-muted" />
          {item.testName} · {a.assessment}
        </>
      }
      aside={when}
    />
  );
}
