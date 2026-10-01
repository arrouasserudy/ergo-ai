import { CalendarView } from "@/components/calendar/CalendarView";
import { getI18n } from "@/i18n/server";
import { parseList } from "@/lib/calendar/events";
import { gridRange, monthOf, parseMonth, weekStartOf } from "@/lib/calendar/month";
import { accountCalendar } from "@/lib/calendar/queries";
import { initialsOf } from "@/lib/child-name";
import { listChildren } from "@/lib/children";
import { requireTherapist } from "@/lib/session";
import { localToday } from "@/lib/time";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: `${t.calendar.title} · ${t.app.name}` };
}

/**
 * Every event of the cabinet's children in one month (`?month=YYYY-MM`, default: this
 * month in the practice's time zone). Children, types and view are filtered client-side
 * (`?child=a,b&types=crisis,report&view=agenda`); archived children only with `?archived=1`
 * or when selected by the URL (link from an archived child's page).
 */
export default async function CalendarPage(props: PageProps<"/calendar">) {
  const i18n = await getI18n();
  const { accountId, account } = await requireTherapist();
  const sp = await props.searchParams;

  const today = localToday();
  const month = parseMonth(sp.month) ?? monthOf(today);
  const range = gridRange(month, weekStartOf(i18n.locale));
  const wanted = new Set(parseList(sp.child));
  const archivedFlag = sp.archived === "1";
  const includeArchived = archivedFlag || (wanted.size > 0 && listChildren(accountId, { status: "archived" }).some((c) => wanted.has(c.id)));

  const { children, events } = accountCalendar(accountId, { range, today, warnDays: account.deadlineWarnDays, includeArchived });
  const childOptions = children.map((child) => {
    const name = i18n.childName(child);
    return { id: child.id, name, initials: initialsOf(name).join(""), archived: child.status === "archived" };
  });

  return (
    <div className="mx-auto max-w-7xl">
      <CalendarView
        key={month}
        month={month}
        today={today}
        weekStart={weekStartOf(i18n.locale)}
        events={events}
        childOptions={childOptions}
        includeArchived={archivedFlag}
      />
    </div>
  );
}
