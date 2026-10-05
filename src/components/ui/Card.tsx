import clsx from "clsx";
import type { ReactNode } from "react";

export function Card({ className, id, children }: { className?: string; id?: string; children: ReactNode }) {
  return (
    <section id={id} className={clsx("rounded-2xl border border-line bg-surface shadow-card", className)}>
      {children}
    </section>
  );
}

export function CardHeader({
  title,
  hint,
  action,
  number,
}: {
  title: string;
  hint?: string;
  action?: ReactNode;
  number?: number;
}) {
  return (
    <header className="flex items-start justify-between gap-4 px-5 pt-5 pb-3">
      <div className="min-w-0">
        <h2 className="text-[16px] leading-tight font-semibold tracking-tight">
          {number !== undefined && <span className="me-1">{number}.</span>}
          {title}
        </h2>
        {hint && <p className="mt-1 text-[12.5px] text-ink-muted">{hint}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  );
}
