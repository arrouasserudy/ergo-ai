"use client";

import clsx from "clsx";
import { ArrowUpRight, CalendarDays, CalendarPlus, Check } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { deadlineStyle, DONE_STYLE, KIND_STYLES } from "@/components/timeline/kind-styles";
import { Card, CardHeader } from "@/components/ui/Card";
import { useI18n } from "@/i18n/client";
import type { ChildEventKind } from "@/db/schema";
import type { Urgency } from "@/lib/forms/deadlines";
import { childEventNote, childEventTitle } from "./describe";
import { EventDialog, type ReportOption } from "./EventDialog";

export type UpcomingEvent = {
  id: string;
  kind: ChildEventKind;
  date: string;
  time: string | null;
  details: string | null;
  report: { id: string; docType: string; sessionDate: string; status: string } | null;
  done: boolean;
  urgency: Urgency;
};

/**
 * The child's upcoming meetings and to-dos (overview tab). A row opens the event for
 * editing; `?event=<id>` (links from the calendar) opens it on arrival.
 */
export function UpcomingEvents({
  childId,
  events,
  reports,
  today,
  linked,
  canAdd,
}: {
  childId: string;
  events: UpcomingEvent[];
  reports: ReportOption[];
  today: string;
  /** The event named by `?event=` (opened on arrival), even when it is past. */
  linked: UpcomingEvent | null;
  canAdd: boolean;
}) {
  const i18n = useI18n();
  const { t } = i18n;
  const c = t.childEvents;
  const [editing, setEditing] = useState<string | null>(linked?.id ?? null);
  const [adding, setAdding] = useState(false);
  const current = editing ? (events.find((e) => e.id === editing) ?? (linked?.id === editing ? linked : null)) : null;

  const close = () => {
    setEditing(null);
    setAdding(false);
    const url = new URL(window.location.href);
    if (url.searchParams.has("event")) {
      url.searchParams.delete("event");
      window.history.replaceState(null, "", url.pathname + url.search);
    }
  };

  return (
    <Card>
      <CardHeader title={c.upcomingTitle} hint={c.upcomingHint} />
      {events.length === 0 ? (
        <p className="px-5 pb-4 text-[13px] text-ink-muted">{c.upcomingEmpty}</p>
      ) : (
        <ul className="divide-y divide-line border-t border-line">
          {events.map((e) => {
            const base = KIND_STYLES[e.kind];
            const style = e.done ? { ...base, ...DONE_STYLE } : e.kind === "report_due" ? { ...base, ...deadlineStyle(e.urgency) } : base;
            const Icon = e.done ? Check : base.icon;
            const title = childEventTitle(e, i18n);
            const note = childEventNote(e);
            const state = e.done ? c.done : c.state[e.urgency];
            return (
              <li key={e.id} className="flex items-stretch">
                <button
                  type="button"
                  onClick={() => setEditing(e.id)}
                  aria-label={c.edit(title)}
                  className="flex min-w-0 flex-1 items-start gap-3 px-5 py-3 text-start transition-colors hover:bg-surface-muted"
                >
                  <span aria-hidden className={clsx("mt-0.5 grid size-8 shrink-0 place-items-center rounded-full border", style.chip)}>
                    <Icon className="size-4" strokeWidth={1.9} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <bdi className="block truncate text-[14px] font-medium">{title}</bdi>
                    <span className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[12px] text-ink-muted">
                      <span className="first-letter:uppercase">{e.date === today ? c.today : i18n.dayLong(e.date)}</span>
                      {e.time && <time>· {e.time}</time>}
                      {state && (
                        <span className={clsx("font-medium", e.done ? "text-ok-ink" : e.urgency === "overdue" ? "text-danger" : "text-warn-ink")}>· {state}</span>
                      )}
                    </span>
                    {note && (
                      <span dir="auto" className="mt-0.5 line-clamp-2 block text-[12.5px] whitespace-pre-line text-ink-soft">
                        {note}
                      </span>
                    )}
                  </span>
                </button>
                {e.kind === "report_due" && e.report && (
                  <Link
                    href={`/reports/${e.report.id}`}
                    aria-label={title}
                    title={title}
                    className="grid w-12 shrink-0 place-items-center text-ink-muted transition-colors hover:bg-surface-muted hover:text-primary"
                  >
                    <ArrowUpRight className="size-4 rtl:-scale-x-100" />
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      )}
      <div className="flex flex-wrap items-center justify-between gap-x-4 border-t border-line px-5">
        {canAdd ? (
          <button type="button" onClick={() => setAdding(true)} className="inline-flex items-center gap-1.5 py-3 text-[12.5px] font-medium text-primary hover:underline">
            <CalendarPlus className="size-3.5" />
            {c.add}
          </button>
        ) : (
          <span />
        )}
        <Link href={`/calendar?child=${childId}`} className="inline-flex items-center gap-1.5 py-3 text-[12.5px] font-medium text-primary hover:underline">
          <CalendarDays className="size-3.5" />
          {t.calendar.openCalendar}
        </Link>
      </div>

      {(adding || current) && (
        <EventDialog
          key={current?.id ?? "new"}
          childId={childId}
          reports={reports}
          defaultDate={today}
          event={current ? { id: current.id, kind: current.kind, date: current.date, time: current.time, reportId: current.report?.id ?? null, details: current.details } : undefined}
          onClose={close}
        />
      )}
    </Card>
  );
}
