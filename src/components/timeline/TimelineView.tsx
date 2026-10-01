"use client";

import clsx from "clsx";
import { ArrowDown, Baby, CalendarDays, ClipboardList, FileText, Flag, FolderPlus, Gauge, Hand, Zap, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useMemo, useRef, useState, type ReactNode } from "react";
import { ReportStatusBadge } from "@/components/reports/ReportStatusBadge";
import { Badge } from "@/components/ui/Badge";
import type { ReportStatus } from "@/db/schema";
import { isolate, type I18n } from "@/i18n";
import { useI18n } from "@/i18n/client";
import { filterOf, groupByYear, TIMELINE_FILTERS, type TimelineEvent, type TimelineFilter, type TimelineKind, type TimelineScore } from "@/lib/timeline/events";

const STYLES: Record<TimelineKind, { icon: LucideIcon; dot: string }> = {
  birth: { icon: Baby, dot: "bg-primary text-primary-ink border-primary" },
  followUp: { icon: Flag, dot: "bg-primary text-primary-ink border-primary" },
  fileCreated: { icon: FolderPlus, dot: "bg-primary text-primary-ink border-primary" },
  crisis: { icon: Zap, dot: "bg-warn text-warn-ink border-warn-ink/30" },
  difficulty: { icon: Hand, dot: "bg-muted-badge text-muted-badge-ink border-muted-badge-ink/25" },
  report: { icon: FileText, dot: "bg-ok text-ok-ink border-ok-ink/25" },
  form: { icon: ClipboardList, dot: "bg-tint text-tint-ink border-tint-ink/25" },
  formDate: { icon: CalendarDays, dot: "bg-surface text-tint-ink border-tint-ink/40" },
  assessment: { icon: Gauge, dot: "bg-surface-muted text-ink-soft border-line-strong" },
};

const ASSESSMENT_TONES = { draft: "warn", sent: "tint", completed: "ok" } as const;

type Props = {
  events: TimelineEvent[];
  birthDate: string | null;
  /** Compact list without controls (child page card). */
  preview?: boolean;
};

/** A child's timeline: year groups on a vertical line (start side), filter chips and order. */
export function TimelineView({ events, birthDate, preview = false }: Props) {
  const i18n = useI18n();
  const { t } = i18n;
  const tl = t.timeline;
  const [active, setActive] = useState<TimelineFilter[]>([]);
  const [order, setOrder] = useState<"oldest" | "newest">("oldest");
  const endRef = useRef<HTMLDivElement>(null);

  const counts = useMemo(() => {
    const map = new Map<TimelineFilter, number>();
    for (const e of events) map.set(filterOf(e.kind), (map.get(filterOf(e.kind)) ?? 0) + 1);
    return map;
  }, [events]);

  const shown = useMemo(() => {
    const filtered = active.length ? events.filter((e) => active.includes(filterOf(e.kind))) : events;
    return order === "newest" ? [...filtered].reverse() : filtered;
  }, [events, active, order]);

  if (events.length === 0) return <p className="text-[13px] text-ink-muted">{tl.empty}</p>;

  const toggle = (f: TimelineFilter) => setActive((cur) => (cur.includes(f) ? cur.filter((x) => x !== f) : [...cur, f]));
  const chip = (pressed: boolean) =>
    clsx(
      "inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-[13px] transition-colors",
      pressed ? "border-primary bg-tint font-medium text-tint-ink" : "border-line-strong bg-surface text-ink-soft hover:bg-surface-muted",
    );

  const list = preview ? (
    <ol className="relative">
      <Line />
      {shown.map((e) => (
        <EventItem key={e.id} event={e} birthDate={birthDate} i18n={i18n} />
      ))}
    </ol>
  ) : (
    <div className="space-y-2">
      {groupByYear(shown).map((group) => (
        <section key={group.year} aria-labelledby={`year-${group.year}`}>
          <h2 id={`year-${group.year}`} className="py-2">
            <span className="inline-flex h-7 items-center rounded-full border border-line-strong bg-surface px-3 text-[13px] font-semibold tabular-nums shadow-card">
              {group.year}
            </span>
          </h2>
          <ol className="relative">
            <Line />
            {group.events.map((e) => (
              <EventItem key={e.id} event={e} birthDate={birthDate} i18n={i18n} />
            ))}
          </ol>
        </section>
      ))}
    </div>
  );

  if (preview) return list;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div role="group" aria-label={tl.filtersLabel} className="flex min-w-0 flex-1 flex-wrap gap-2">
          <button type="button" aria-pressed={active.length === 0} onClick={() => setActive([])} className={chip(active.length === 0)}>
            {tl.all}
            <span className="text-[11.5px] text-ink-muted tabular-nums">{events.length}</span>
          </button>
          {TIMELINE_FILTERS.filter((f) => counts.has(f)).map((f) => (
            <button key={f} type="button" aria-pressed={active.includes(f)} onClick={() => toggle(f)} className={chip(active.includes(f))}>
              <FilterDot filter={f} />
              {tl.filter[f]}
              <span className="text-[11.5px] text-ink-muted tabular-nums">{counts.get(f)}</span>
            </button>
          ))}
        </div>
        <div role="group" className="flex shrink-0 self-start rounded-xl border border-line-strong bg-surface-muted p-0.5">
          {(["oldest", "newest"] as const).map((o) => (
            <button
              key={o}
              type="button"
              aria-pressed={order === o}
              onClick={() => setOrder(o)}
              className={clsx(
                "h-9 rounded-md px-3 text-[12.5px] whitespace-nowrap transition-colors",
                order === o ? "bg-surface font-medium text-ink shadow-sm" : "text-ink-muted hover:text-ink",
              )}
            >
              {tl.order[o]}
            </button>
          ))}
        </div>
      </div>

      <p className="flex items-center justify-between gap-3 text-[12.5px] text-ink-muted">
        <span>{tl.count(shown.length)}</span>
        {order === "oldest" && shown.length > 6 && (
          <button
            type="button"
            onClick={() => endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })}
            className="inline-flex min-h-9 items-center gap-1 font-medium text-primary hover:underline"
          >
            <ArrowDown className="size-3.5" />
            {tl.jumpToLatest}
          </button>
        )}
      </p>

      {shown.length === 0 ? <p className="text-[13px] text-ink-muted">{tl.noMatch}</p> : list}
      <div ref={endRef} />
    </div>
  );
}

function Line() {
  return <span aria-hidden className="absolute start-[15px] top-0 bottom-0 w-px bg-line-strong" />;
}

function FilterDot({ filter }: { filter: TimelineFilter }) {
  const kind: TimelineKind = filter === "milestone" ? "birth" : filter;
  return <span aria-hidden className={clsx("size-2.5 rounded-full border", STYLES[kind].dot)} />;
}

function EventItem({ event, birthDate, i18n }: { event: TimelineEvent; birthDate: string | null; i18n: I18n }) {
  const { icon: Icon, dot } = STYLES[event.kind];
  const when = event.precision === "day" ? i18n.date(event.date) : `${i18n.date(event.day)}, ${i18n.time(new Date(event.date))}`;
  const age = event.kind !== "birth" && birthDate && event.day >= birthDate ? i18n.age(birthDate, new Date(`${event.day}T12:00:00`)) : null;
  const { title, meta } = describe(event, i18n);

  const body = (
    <>
      <span className="block text-[12px] text-ink-muted">
        <time dateTime={event.date}>{when}</time>
        {age && <span> · {age}</span>}
      </span>
      <span className="mt-0.5 block text-[14px] leading-snug font-medium text-ink">{title}</span>
      {meta && <span className="mt-1 block text-[12.5px] text-ink-soft">{meta}</span>}
    </>
  );

  return (
    <li className="relative ps-11 pb-3 last:pb-1">
      <span aria-hidden className={clsx("absolute start-0 top-1.5 grid size-8 place-items-center rounded-full border", dot)}>
        <Icon className="size-4" strokeWidth={1.9} />
      </span>
      {event.href ? (
        <Link href={event.href} className="block rounded-xl px-3 py-2 transition-colors hover:bg-surface-muted">
          {body}
        </Link>
      ) : (
        <div className="px-3 py-2">{body}</div>
      )}
    </li>
  );
}

function describe(event: TimelineEvent, i18n: I18n): { title: ReactNode; meta: ReactNode } {
  const { t } = i18n;
  const tl = t.timeline;
  switch (event.kind) {
    case "birth":
    case "followUp":
    case "fileCreated":
      return { title: tl[event.kind], meta: null };
    case "crisis":
    case "difficulty": {
      const causes = [...new Set(event.causes.map(i18n.cause))].slice(0, 4).join(" · ");
      return {
        title: (
          <>
            {t.episodes.kind[event.kind]}
            {event.situation && <span className="font-normal text-ink-soft"> · {i18n.situation(event.situation)}</span>}
          </>
        ),
        meta:
          causes || event.minutes || event.open ? (
            <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
              {event.open && <Badge tone="warn">{tl.inProgress}</Badge>}
              {causes && <span>{causes}</span>}
              {event.minutes && <span className="text-ink-muted">{t.episodes.minutes(event.minutes)}</span>}
            </span>
          ) : null,
      };
    }
    case "report":
      return { title: t.reports.eyebrow(t.reports.docType[event.docType] ?? event.docType), meta: <ReportStatusBadge status={event.status as ReportStatus} /> };
    case "form":
      return {
        title: event.action === "sent" ? tl.formSent : tl.formSubmitted[event.by ?? "therapist"],
        meta: <bdi>{event.title}</bdi>,
      };
    case "formDate":
      return { title: <bdi>{event.label}</bdi>, meta: tl.formDateSource(isolate(event.formTitle)) };
    case "assessment":
      return {
        title: <bdi>{event.name}</bdi>,
        meta: (
          <span className="flex flex-col gap-1.5">
            <span>
              <Badge tone={ASSESSMENT_TONES[event.status]}>{t.assessments.status[event.status]}</Badge>
            </span>
            {event.scores.length > 0 && <Scores scores={event.scores} months={t.assessments.months} />}
          </span>
        ),
      };
  }
}

const format = (value: number) => (Number.isInteger(value) ? String(value) : value.toFixed(1));

/** Scores in the test's own language (labels and bands come from its definition). */
function Scores({ scores, months }: { scores: TimelineScore[]; months: string }) {
  return (
    <span dir="auto" className="grid gap-x-4 gap-y-0.5 text-[12px] sm:grid-cols-2">
      {scores.map((s) => (
        <span key={s.label} dir="auto" className="flex min-w-0 items-baseline gap-1.5">
          <span className="truncate text-ink-muted">{s.label}</span>
          <span className="font-medium whitespace-nowrap text-ink tabular-nums">
            {s.value === null ? "—" : s.unit === "months" ? `${format(s.value)} ${months}` : `${format(s.value)}${s.max !== undefined ? ` / ${s.max}` : ""}`}
          </span>
          {s.band && <span className="truncate text-ink-soft">· {s.band}</span>}
        </span>
      ))}
    </span>
  );
}
