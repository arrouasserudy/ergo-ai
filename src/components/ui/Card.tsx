import clsx from "clsx";
import type { ReactNode } from "react";

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <section className={clsx("rounded-xl border border-line bg-surface", className)}>{children}</section>;
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
        <h2 className="font-serif text-[19px] leading-tight font-medium">
          {number !== undefined && <span className="mr-1">{number}.</span>}
          {title}
        </h2>
        {hint && <p className="mt-1 text-[12.5px] text-ink-muted">{hint}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  );
}
