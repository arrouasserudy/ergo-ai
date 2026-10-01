import type { ReactNode } from "react";

export function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="text-[11px] font-semibold tracking-[0.08em] text-ink-muted uppercase">{children}</p>;
}
