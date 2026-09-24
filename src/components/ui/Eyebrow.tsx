import type { ReactNode } from "react";

export function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="text-[10.5px] font-medium tracking-[0.12em] text-ink-muted uppercase">{children}</p>;
}
