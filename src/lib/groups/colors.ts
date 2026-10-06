import type { GroupColor } from "@/db/schema";

/** Tailwind classes of each group color (written out in full so Tailwind keeps them). */
export const GROUP_COLOR_CLASSES: Record<GroupColor, { dot: string; badge: string; ring: string }> = {
  teal: { dot: "bg-teal-600", badge: "bg-teal-50 text-teal-800 ring-teal-200", ring: "ring-teal-600" },
  blue: { dot: "bg-sky-600", badge: "bg-sky-50 text-sky-800 ring-sky-200", ring: "ring-sky-600" },
  violet: { dot: "bg-violet-600", badge: "bg-violet-50 text-violet-800 ring-violet-200", ring: "ring-violet-600" },
  rose: { dot: "bg-rose-600", badge: "bg-rose-50 text-rose-800 ring-rose-200", ring: "ring-rose-600" },
  amber: { dot: "bg-amber-500", badge: "bg-amber-50 text-amber-900 ring-amber-200", ring: "ring-amber-500" },
  green: { dot: "bg-emerald-600", badge: "bg-emerald-50 text-emerald-800 ring-emerald-200", ring: "ring-emerald-600" },
  slate: { dot: "bg-slate-500", badge: "bg-slate-100 text-slate-800 ring-slate-200", ring: "ring-slate-500" },
};
