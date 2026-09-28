import clsx from "clsx";
import type { ReactNode } from "react";

type Tone = "ok" | "warn" | "danger" | "muted" | "tint";

const TONES: Record<Tone, string> = {
  ok: "bg-ok text-ok-ink",
  warn: "bg-warn text-warn-ink",
  danger: "bg-danger/10 text-danger",
  muted: "bg-muted-badge text-muted-badge-ink",
  tint: "bg-tint text-tint-ink",
};

export function Badge({ tone = "tint", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span className={clsx("inline-flex items-center rounded-full px-2.5 py-0.5 text-[11.5px] font-medium whitespace-nowrap", TONES[tone])}>
      {children}
    </span>
  );
}
