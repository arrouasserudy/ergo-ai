"use client";

import clsx from "clsx";
import { CalendarDays, CalendarPlus, Check, ChevronLeft, ChevronRight, List, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore, useTransition, type ReactNode } from "react";
import { EventDialog, type ReportOption } from "@/components/child-events/EventDialog";
import { childEventNote, childEventTitle } from "@/components/child-events/describe";
import { deadlineStyle, DONE_STYLE, KIND_STYLES } from "@/components/timeline/kind-styles";
import { Button } from "@/components/ui/Button";
import { isolate, type I18n } from "@/i18n";
import { useI18n } from "@/i18n/client";
import { CALENDAR_TYPES, filterCalendar, groupByDay, parseList, parseTypes, typeOf, type CalendarEvent, type CalendarType } from "@/lib/calendar/events";
import { addMonths, monthGrid, weekdayOrder, type WeekStart } from "@/lib/calendar/month";
import { ChildBadge } from "./ChildBadge";
import { ChildPicker, type PickerChild } from "./ChildPicker";

type Props = {
  month: string;
  today: string;
  weekStart: WeekStart;
  /** Every event of the grid's range for the loaded children (filters apply here, instantly). */
  events: CalendarEvent[];
  childOptions: PickerChild[];
  includeArchived: boolean;
  /** Reports of each child, for the "report due" kind of a new event. */
  reportsByChild: Record<string, ReportOption[]>;
};

type View = "month" | "agenda";
const MAX_CHIPS = 3;
const MAX_MARKS = 4;

const DESKTOP = "(min-width: 768px)";
const subscribe = (onChange: () => void) => {
  const mq = window.matchMedia(DESKTOP);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
};
/** null on the server: the default view is then chosen by CSS only (agenda below md, month above). */
function useIsDesktop(): boolean | null {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(DESKTOP).matches,
    () => null,
  );
}

/**
 * The cabinet's calendar. Month and archived children come from the server (URL change,
 * new data); children, types and view are filtered here and written back to the URL with
 * `history.replaceState` (shareable, no reload). Color = event type (legend = type filter),
 * the child = a monogram badge (see ChildBadge).
 */
export function CalendarView({ month, today, weekStart, events, childOptions, includeArchived, reportsByChild }: Props) {
  const i18n = useI18n();
  const { t } = i18n;
  const c = t.calendar;
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [openDay, setOpenDay] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const isDesktop = useIsDesktop();

  const known = useMemo(() => new Map(childOptions.map((o) => [o.id, o])), [childOptions]);
  const childParam = params.get("child");
  const typesParam = params.get("types");
  const selected = useMemo(() => parseList(childParam).filter((id) => known.has(id)), [childParam, known]);
  const types = useMemo(() => parseTypes(typesParam), [typesParam]);
  const viewParam = params.get("view");
  const view: View | null = viewParam === "month" || viewParam === "agenda" ? viewParam : null;
  const effectiveView: View | null = view ?? (isDesktop === null ? null : isDesktop ? "month" : "agenda");
  const single = selected.length === 1 ? known.get(selected[0])! : null;

  // Archived children are loaded when asked for, or when selected through the URL; without a selection only the asked-for ones show.
  const pickerOptions = useMemo(
    () => childOptions.filter((o) => !o.archived || includeArchived || selected.includes(o.id)),
    [childOptions, includeArchived, selected],
  );
  const visibleChildren = useMemo(() => new Set(pickerOptions.map((o) => o.id)), [pickerOptions]);

  const byChild = useMemo(
    () => (selected.length ? events.filter((e) => selected.includes(e.childId)) : events.filter((e) => visibleChildren.has(e.childId))),
    [events, selected, visibleChildren],
  );
  const shown = useMemo(() => filterCalendar(byChild, { children: [], types }), [byChild, types]);
  const days = useMemo(() => groupByDay(shown), [shown]);
  const inMonth = (day: string) => day.startsWith(month);
  const counts = useMemo(() => {
    const map = new Map<CalendarType, number>();
    for (const e of byChild) if (e.day.startsWith(month)) map.set(typeOf(e.kind), (map.get(typeOf(e.kind)) ?? 0) + 1);
    return map;
  }, [byChild, month]);

  const hrefWith = (changes: Record<string, string | null>) => {
    const sp = new URLSearchParams(params);
    for (const [key, value] of Object.entries(changes)) {
      if (value) sp.set(key, value);
      else sp.delete(key);
    }
    const qs = sp.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  };
  /** Client-side filters: the URL follows without a server round trip. */
  const setLocal = (changes: Record<string, string | null>) => window.history.replaceState(null, "", hrefWith(changes));

  const setChildren = (ids: string[]) => setLocal({ child: ids.join(",") || null });
  const toggleType = (type: CalendarType) => {
    const next = types.includes(type) ? types.filter((x) => x !== type) : [...types, type];
    setLocal({ types: next.length === 0 || next.length === CALENDAR_TYPES.length ? null : next.join(",") });
  };
  const setArchived = (value: boolean) => startTransition(() => router.replace(hrefWith({ archived: value ? "1" : null }), { scroll: false }));

  const currentMonth = today.slice(0, 7);
  const childName = (id: string) => known.get(id)?.name ?? "";
  const title = single ? c.oneChild(isolate(single.name)) : c.title;
  const childChoices = useMemo(
    () => childOptions.filter((o) => !o.archived || o.id === single?.id).map((o) => ({ id: o.id, name: o.name, reports: reportsByChild[o.id] ?? [] })),
    [childOptions, single, reportsByChild],
  );

  const monthClass = view === "month" ? "block" : view === "agenda" ? "hidden" : "hidden md:block";
  const agendaClass = view === "agenda" ? "block" : view === "month" ? "hidden" : "md:hidden";

  return (
    <div className={clsx("space-y-4", pending && "opacity-80")}>
      <header className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <h1 className="flex items-center gap-2 text-[28px] leading-tight font-semibold tracking-tight">
            {single && <ChildBadge childId={single.id} initials={single.initials} size="md" />}
            <span className="min-w-0">{title}</span>
          </h1>
          <p className="mt-1 max-w-2xl text-[13px] text-ink-muted">{c.subtitle}</p>
        </div>
        <Button onClick={() => setAdding(true)} disabled={childChoices.length === 0}>
          <CalendarPlus className="size-4" />
          {t.childEvents.add}
        </Button>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <ChildPicker
          options={pickerOptions}
          selected={selected}
          onChange={setChildren}
          includeArchived={includeArchived}
          onIncludeArchivedChange={setArchived}
        />
        <div role="group" aria-label={c.viewLabel} className="flex rounded-xl border border-line-strong bg-surface-muted p-0.5">
          {(["month", "agenda"] as const).map((v) => {
            const Icon = v === "month" ? CalendarDays : List;
            // Without an explicit view, the default (agenda on phones, month above) is styled by CSS.
            const state = view ? view === v : v === "month" ? "md" : "phone";
            return (
              <button
                key={v}
                type="button"
                aria-pressed={effectiveView ? effectiveView === v : undefined}
                onClick={() => setLocal({ view: v })}
                className={clsx(
                  "inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-[13px] transition-colors",
                  state === true && "bg-surface font-medium text-ink shadow-sm",
                  state === false && "text-ink-muted hover:text-ink",
                  state === "md" && "text-ink-muted md:bg-surface md:font-medium md:text-ink md:shadow-sm",
                  state === "phone" && "bg-surface font-medium text-ink shadow-sm md:bg-transparent md:font-normal md:text-ink-muted md:shadow-none",
                )}
              >
                <Icon className="size-4" />
                {c.view[v]}
              </button>
            );
          })}
        </div>
      </div>

      <Legend types={types} counts={counts} onToggle={toggleType} onAll={() => setLocal({ types: null })} />

      <section className="overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
        <div className="flex items-center justify-between gap-2 border-b border-line px-3 py-2.5 sm:px-4">
          <h2 className="text-[17px] font-semibold tracking-tight capitalize">{i18n.monthTitle(month)}</h2>
          <nav className="flex items-center gap-1">
            {month !== currentMonth && (
              <Link href={hrefWith({ month: null })} className="inline-flex h-9 items-center rounded-full border border-line-strong px-3.5 text-[13px] font-medium hover:bg-surface-muted">
                {c.today}
              </Link>
            )}
            <Link href={hrefWith({ month: addMonths(month, -1) })} aria-label={c.prev} title={c.prev} className="grid size-10 place-items-center rounded-full hover:bg-surface-muted">
              <ChevronLeft className="size-5 rtl:rotate-180" />
            </Link>
            <Link href={hrefWith({ month: addMonths(month, 1) })} aria-label={c.next} title={c.next} className="grid size-10 place-items-center rounded-full hover:bg-surface-muted">
              <ChevronRight className="size-5 rtl:rotate-180" />
            </Link>
          </nav>
        </div>

        <div className={monthClass}>
          <MonthGrid
            month={month}
            today={today}
            weekStart={weekStart}
            days={days}
            showBadge={!single}
            childOf={(id) => known.get(id)}
            onOpenDay={setOpenDay}
            i18n={i18n}
          />
        </div>
        <div className={agendaClass}>
          <Agenda days={[...days].filter(([day]) => inMonth(day))} today={today} showBadge={!single} childName={childName} childOf={(id) => known.get(id)} i18n={i18n} />
          {![...days.keys()].some(inMonth) && <p className="px-4 py-10 text-center text-[13px] text-ink-muted">{counts.size ? c.noMatch : c.empty}</p>}
        </div>
      </section>

      {adding && (
        <EventDialog
          childChoices={childChoices}
          defaultChildId={single?.id}
          defaultDate={month === currentMonth ? today : `${month}-01`}
          onClose={() => setAdding(false)}
        />
      )}

      {openDay && (
        <DayDialog day={openDay} onClose={() => setOpenDay(null)} title={i18n.dayLong(openDay)} closeLabel={c.close}>
          <ul className="space-y-1">
            {(days.get(openDay) ?? []).map((e) => (
              <AgendaItem key={e.id} event={e} showBadge={!single} childName={childName(e.childId)} child={known.get(e.childId)} i18n={i18n} />
            ))}
          </ul>
        </DayDialog>
      )}
    </div>
  );
}

/** Type legend: color + icon per type, each a toggle (none pressed = all types). */
function Legend({ types, counts, onToggle, onAll }: { types: CalendarType[]; counts: Map<CalendarType, number>; onToggle: (t: CalendarType) => void; onAll: () => void }) {
  const { t } = useI18n();
  const c = t.calendar;
  const chip = (pressed: boolean) =>
    clsx(
      "inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-[12.5px] transition-colors",
      pressed ? "border-primary bg-tint font-medium text-tint-ink" : "border-line-strong bg-surface text-ink-soft hover:bg-surface-muted",
    );
  return (
    <div role="group" aria-label={c.typesLabel} className="flex flex-wrap gap-1.5">
      <button type="button" aria-pressed={types.length === 0} onClick={onAll} className={chip(types.length === 0)}>
        {c.allTypes}
      </button>
      {CALENDAR_TYPES.map((type) => {
        const style = KIND_STYLES[type];
        const Icon = style.icon;
        const n = counts.get(type) ?? 0;
        return (
          <button key={type} type="button" aria-pressed={types.includes(type)} onClick={() => onToggle(type)} className={clsx(chip(types.includes(type)), n === 0 && !types.includes(type) && "opacity-60")}>
            <span aria-hidden className={clsx("grid size-5 place-items-center rounded-full border", style.chip)}>
              <Icon className="size-3" strokeWidth={2} />
            </span>
            {c.type[type]}
            <span className="text-[11px] text-ink-muted tabular-nums">{n}</span>
          </button>
        );
      })}
    </div>
  );
}

type ChildOf = (id: string) => PickerChild | undefined;

function styleOf(event: CalendarEvent) {
  const base = KIND_STYLES[event.kind];
  if (event.kind === "deadline") return { ...base, ...deadlineStyle(event.urgency) };
  if (event.kind === "report_due") return event.done ? { ...base, ...DONE_STYLE, icon: Check } : { ...base, ...deadlineStyle(event.urgency) };
  return base;
}

/** The short label of a chip (the agenda adds the details). */
function chipTitle(event: CalendarEvent, i18n: I18n): string {
  const { t } = i18n;
  switch (event.kind) {
    case "birthday":
      return event.age === 0 ? t.timeline.birth : t.calendar.birthday(t.age.years(event.age));
    case "deadline":
      return event.title;
    default:
      return childEventTitle(event, i18n);
  }
}

function MonthGrid({
  month,
  today,
  weekStart,
  days,
  showBadge,
  childOf,
  onOpenDay,
  i18n,
}: {
  month: string;
  today: string;
  weekStart: WeekStart;
  days: Map<string, CalendarEvent[]>;
  showBadge: boolean;
  childOf: ChildOf;
  onOpenDay: (day: string) => void;
  i18n: I18n;
}) {
  const { t } = i18n;
  const weeks = monthGrid(month, weekStart);
  return (
    <div role="grid" aria-label={i18n.monthTitle(month)}>
      <div role="row" className="grid grid-cols-7 border-b border-line bg-surface-muted">
        {weekdayOrder(weekStart).map((d) => (
          <div key={d} role="columnheader" className="px-1 py-2 text-center text-[11px] font-medium tracking-wide text-ink-muted uppercase">
            <span className="md:hidden">{i18n.weekday(d, "narrow")}</span>
            <span className="hidden md:inline">{i18n.weekday(d, "short")}</span>
          </div>
        ))}
      </div>
      {weeks.map((week) => (
        <div key={week[0].day} role="row" className="grid grid-cols-7 border-b border-line last:border-b-0">
          {week.map(({ day, inMonth }) => {
            const list = days.get(day) ?? [];
            const isToday = day === today;
            const extra = list.length - MAX_CHIPS;
            const marks = [...new Map(list.map((e) => [e.kind === "deadline" ? `deadline:${e.urgency}` : typeOf(e.kind), e])).values()].slice(0, MAX_MARKS);
            return (
              <div
                key={day}
                role="gridcell"
                aria-current={isToday ? "date" : undefined}
                className={clsx(
                  "relative min-h-16 min-w-0 border-e border-line p-1 last:border-e-0 md:min-h-28 md:p-1.5",
                  !inMonth && "bg-surface-muted/70",
                  isToday && "bg-tint/40",
                )}
              >
                <span
                  className={clsx(
                    "grid size-6 place-items-center rounded-full text-[12px] tabular-nums md:size-7 md:text-[12.5px]",
                    isToday ? "bg-primary font-semibold text-primary-ink" : inMonth ? "text-ink" : "text-ink-muted",
                  )}
                >
                  {Number(day.slice(8))}
                </span>

                {/* Phones: one mark per type, the whole cell opens the day. */}
                {list.length > 0 && (
                  <>
                    <span aria-hidden className="mt-1 flex flex-wrap gap-0.5 md:hidden">
                      {marks.map((e) => (
                        <span key={e.id} className={clsx("size-2 rounded-full", styleOf(e).mark)} />
                      ))}
                    </span>
                    <button
                      type="button"
                      onClick={() => onOpenDay(day)}
                      aria-label={`${i18n.dayLong(day)} · ${t.timeline.count(list.length)}`}
                      className="absolute inset-0 md:hidden"
                    />
                  </>
                )}

                <ul className="mt-1 hidden space-y-0.5 md:block">
                  {list.slice(0, MAX_CHIPS).map((e) => (
                    <li key={e.id}>
                      <EventChip event={e} showBadge={showBadge} child={childOf(e.childId)} i18n={i18n} />
                    </li>
                  ))}
                  {extra > 0 && (
                    <li>
                      <button type="button" onClick={() => onOpenDay(day)} className="w-full rounded-md px-1.5 py-0.5 text-start text-[11.5px] font-medium text-primary hover:bg-surface-muted">
                        {i18n.t.calendar.more(extra)}
                      </button>
                    </li>
                  )}
                </ul>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function EventChip({ event, showBadge, child, i18n }: { event: CalendarEvent; showBadge: boolean; child: PickerChild | undefined; i18n: I18n }) {
  const style = styleOf(event);
  const Icon = style.icon;
  const label = chipTitle(event, i18n);
  const time = event.time;
  const full = [child?.name, label, time].filter(Boolean).join(" · ");
  return (
    <Link href={event.href!} title={full} className={clsx("flex min-w-0 items-center gap-1 rounded-md border px-1 py-0.5 text-[11.5px] leading-tight transition-[filter] hover:brightness-95", style.chip)}>
      {showBadge && child && <ChildBadge childId={child.id} initials={child.initials} size="xs" />}
      <Icon aria-hidden className="size-3 shrink-0" strokeWidth={2} />
      {time && <span className="shrink-0 tabular-nums opacity-80">{time}</span>}
      <bdi className="min-w-0 truncate">{label}</bdi>
      <span className="sr-only">{child?.name}</span>
    </Link>
  );
}

function Agenda({
  days,
  today,
  showBadge,
  childName,
  childOf,
  i18n,
}: {
  days: [string, CalendarEvent[]][];
  today: string;
  showBadge: boolean;
  childName: (id: string) => string;
  childOf: ChildOf;
  i18n: I18n;
}) {
  return (
    <div className="divide-y divide-line">
      {days.map(([day, list]) => (
        <section key={day} aria-labelledby={`day-${day}`} className="px-3 py-3 sm:px-4">
          <h3 id={`day-${day}`} className="mb-1 flex items-center gap-2 text-[13px] font-semibold">
            <span className="inline-block first-letter:uppercase">{i18n.dayLong(day)}</span>
            {day === today && <span className="rounded-full bg-primary px-2 py-0.5 text-[11px] font-medium text-primary-ink">{i18n.t.calendar.today}</span>}
          </h3>
          <ul className="space-y-1">
            {list.map((e) => (
              <AgendaItem key={e.id} event={e} showBadge={showBadge} childName={childName(e.childId)} child={childOf(e.childId)} i18n={i18n} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

/** One event with its full description (agenda, day list): type icon, child, title, details. */
function AgendaItem({ event, showBadge, childName, child, i18n }: { event: CalendarEvent; showBadge: boolean; childName: string; child: PickerChild | undefined; i18n: I18n }) {
  const { t } = i18n;
  const style = styleOf(event);
  const Icon = style.icon;
  const time = event.time;

  let title: ReactNode = chipTitle(event, i18n);
  let meta: ReactNode = null;
  if (event.kind === "deadline") {
    title = t.calendar.deadline(isolate(event.title));
    meta = <span className={clsx(event.urgency === "overdue" && "font-medium text-danger", event.urgency === "soon" && "font-medium text-warn-ink")}>{t.calendar.deadlineMeta[event.urgency]}</span>;
  } else if (event.kind !== "birthday") {
    const note = childEventNote(event);
    const state = event.kind === "report_due" ? (event.done ? t.calendar.reportDone : t.childEvents.state[event.urgency]) : "";
    meta = (state || note) && (
      <>
        {state && <span className={clsx("font-medium", event.kind === "report_due" && event.done ? "text-ok-ink" : event.urgency === "overdue" ? "text-danger" : "text-warn-ink")}>{state}</span>}
        {state && note && " · "}
        {note && (
          <bdi dir="auto" className="whitespace-pre-line">
            {note}
          </bdi>
        )}
      </>
    );
  }

  return (
    <li>
      <Link href={event.href!} className="flex gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-surface-muted">
        <span aria-hidden className={clsx("mt-0.5 grid size-8 shrink-0 place-items-center rounded-full border", style.chip)}>
          <Icon className="size-4" strokeWidth={1.9} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex min-w-0 items-center gap-1.5 text-[12px] text-ink-muted">
            {showBadge && child && <ChildBadge childId={child.id} initials={child.initials} size="xs" />}
            <bdi className="truncate font-medium text-ink-soft">{childName}</bdi>
            {time && <time>· {time}</time>}
          </span>
          <span className="mt-0.5 block text-[14px] leading-snug font-medium text-ink">{title}</span>
          {meta && <span className="mt-0.5 block text-[12.5px] text-ink-soft">{meta}</span>}
        </span>
      </Link>
    </li>
  );
}

/** A day's events in a modal (overflowing cell, or any day on phones). */
function DayDialog({ day, title, closeLabel, onClose, children }: { day: string; title: string; closeLabel: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, [day]);
  return (
    <dialog
      ref={ref}
      aria-labelledby="day-dialog-title"
      onClose={onClose}
      onClick={(e) => e.target === ref.current && ref.current?.close()}
      className="m-auto w-[min(28rem,calc(100vw-2rem))] rounded-2xl border border-line bg-surface p-0 text-ink shadow-pop backdrop:bg-ink/30 backdrop:backdrop-blur-[2px]"
    >
      <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-3">
        <h2 id="day-dialog-title" className="text-[15px] font-semibold first-letter:uppercase">
          {title}
        </h2>
        <button type="button" onClick={() => ref.current?.close()} aria-label={closeLabel} className="grid size-10 place-items-center rounded-full text-ink-muted hover:bg-surface-muted">
          <X className="size-5" />
        </button>
      </div>
      <div className="max-h-[70dvh] overflow-y-auto px-2 py-2">{children}</div>
    </dialog>
  );
}
