import { Baby, Cake, CalendarClock, CalendarDays, ClipboardList, FileText, Flag, FolderPlus, Gauge, Hand, Zap, type LucideIcon } from "lucide-react";
import type { Urgency } from "@/lib/forms/deadlines";
import type { CalendarKind } from "@/lib/calendar/events";
import type { TimelineKind } from "@/lib/timeline/events";

/**
 * One color and one icon per event type, shared by the child's timeline and the cabinet's
 * calendar, so a type always looks the same. Colors are app tokens (globals.css), each a
 * distinct hue; the icon is the second channel, so color is never the only cue.
 * - `dot`: the timeline's round marker.
 * - `chip`: an event chip in the calendar (soft background, ink text).
 * - `mark`: a small solid swatch (legend, compact month cells on phones).
 */
export type KindStyle = { icon: LucideIcon; dot: string; chip: string; mark: string };

export const KIND_STYLES: Record<TimelineKind | CalendarKind, KindStyle> = {
  birth: { icon: Baby, dot: "bg-primary text-primary-ink border-primary", chip: "bg-primary text-primary-ink border-primary", mark: "bg-primary" },
  followUp: { icon: Flag, dot: "bg-primary text-primary-ink border-primary", chip: "bg-primary text-primary-ink border-primary", mark: "bg-primary" },
  fileCreated: { icon: FolderPlus, dot: "bg-primary text-primary-ink border-primary", chip: "bg-primary text-primary-ink border-primary", mark: "bg-primary" },
  crisis: { icon: Zap, dot: "bg-warn text-warn-ink border-warn-ink/30", chip: "bg-warn text-warn-ink border-warn-ink/25", mark: "bg-warn-ink" },
  difficulty: {
    icon: Hand,
    dot: "bg-muted-badge text-muted-badge-ink border-muted-badge-ink/25",
    chip: "bg-muted-badge text-muted-badge-ink border-muted-badge-ink/20",
    mark: "bg-muted-badge-ink",
  },
  report: { icon: FileText, dot: "bg-ok text-ok-ink border-ok-ink/25", chip: "bg-ok text-ok-ink border-ok-ink/20", mark: "bg-ok-ink" },
  form: { icon: ClipboardList, dot: "bg-tint text-tint-ink border-tint-ink/25", chip: "bg-tint text-tint-ink border-tint-ink/20", mark: "bg-tint-ink" },
  formDate: {
    icon: CalendarDays,
    dot: "bg-surface text-tint-ink border-tint-ink/40",
    chip: "bg-surface text-tint-ink border-tint-ink/40",
    mark: "bg-surface ring-[1.5px] ring-inset ring-tint-ink",
  },
  assessment: { icon: Gauge, dot: "bg-info text-info-ink border-info-ink/25", chip: "bg-info text-info-ink border-info-ink/20", mark: "bg-info-ink" },
  birthday: { icon: Cake, dot: "bg-rose text-rose-ink border-rose-ink/25", chip: "bg-rose text-rose-ink border-rose-ink/20", mark: "bg-rose-ink" },
  // Deadlines: a dashed outline whose ink is the due state (see `deadlineStyle`).
  deadline: {
    icon: CalendarClock,
    dot: "bg-surface text-ink-soft border-dashed border-ink-muted",
    chip: "bg-surface text-ink-soft border-dashed border-ink-muted",
    mark: "bg-surface ring-[1.5px] ring-inset ring-ink-muted",
  },
};

/** A deadline's chip and mark: orange within the warning window, red when overdue (as the bell and badges). */
export function deadlineStyle(urgency: Urgency): Pick<KindStyle, "chip" | "mark"> {
  if (urgency === "overdue") return { chip: "bg-danger/10 text-danger border-dashed border-danger", mark: "bg-surface ring-[1.5px] ring-inset ring-danger" };
  if (urgency === "soon") return { chip: "bg-surface text-warn-ink border-dashed border-warn-ink", mark: "bg-surface ring-[1.5px] ring-inset ring-warn-ink" };
  return KIND_STYLES.deadline;
}
