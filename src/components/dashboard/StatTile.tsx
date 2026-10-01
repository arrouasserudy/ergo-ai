import clsx from "clsx";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";

type Tone = "tint" | "warn" | "danger";

const ICON_TONES: Record<Tone, string> = {
  tint: "bg-tint text-tint-ink",
  warn: "bg-warn text-warn-ink",
  danger: "bg-danger/10 text-danger",
};

/** One figure of the home page, linking to the page that explains it. */
export function StatTile({ href, label, value, hint, icon: Icon, tone = "tint" }: { href: string; label: string; value: number; hint: string; icon: LucideIcon; tone?: Tone }) {
  return (
    <Link
      href={href}
      className="flex flex-col rounded-2xl border border-line bg-surface p-4 shadow-card transition-colors hover:border-line-strong sm:p-5"
    >
      <span className="flex items-start justify-between gap-3">
        <span className="text-[13px] font-medium text-ink-soft">{label}</span>
        <span className={clsx("grid size-9 shrink-0 place-items-center rounded-full", ICON_TONES[tone])}>
          <Icon className="size-[18px]" strokeWidth={1.75} />
        </span>
      </span>
      <span className="mt-1 text-[30px] leading-none font-semibold tracking-tight tabular-nums">{value}</span>
      <span className={clsx("mt-2 text-[12px]", tone === "danger" ? "text-danger" : tone === "warn" ? "text-warn-ink" : "text-ink-muted")}>{hint}</span>
    </Link>
  );
}
