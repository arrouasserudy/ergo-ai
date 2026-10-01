"use client";

import clsx from "clsx";
import { Bell, Settings } from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { useI18n } from "@/i18n/client";

export type BellItem = {
  id: string;
  href: string;
  childName: string;
  title: string;
  dueLabel: string;
  level: "soon" | "overdue";
};

/** Forms due soon or overdue, behind a bell with a count (red when anything is overdue). */
export function NotificationBell({ items }: { items: BellItem[] }) {
  const { t } = useI18n();
  const n = t.notifications;
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const overdue = items.filter((i) => i.level === "overdue");
  const soon = items.filter((i) => i.level === "soon");

  // Close on outside click and Escape (links close it too).
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => !root.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={`${n.label}${items.length ? ` (${items.length})` : ""}`}
        className="relative grid size-11 place-items-center rounded-full text-ink-soft transition-colors hover:bg-surface hover:text-ink hover:shadow-card"
      >
        <Bell className="size-5" />
        {items.length > 0 && (
          <span
            className={clsx(
              "absolute end-1.5 top-1.5 grid h-[18px] min-w-[18px] place-items-center rounded-full px-1 text-[10.5px] font-semibold text-white",
              overdue.length ? "bg-danger" : "bg-warn-ink",
            )}
          >
            {items.length > 99 ? "99+" : items.length}
          </span>
        )}
      </button>

      {open && (
        <div
          id={panelId}
          role="dialog"
          aria-label={n.label}
          // Phones: full width under the header; larger screens: anchored to the bell.
          className="fixed inset-x-4 top-[calc(env(safe-area-inset-top)+4rem)] z-50 overflow-hidden rounded-2xl border border-line bg-surface text-ink shadow-pop md:absolute md:inset-x-auto md:end-0 md:top-12 md:w-[22rem]"
        >
          <p className="border-b border-line px-4 py-3 text-[14.5px] font-semibold">{n.label}</p>
          <div className="max-h-[min(70dvh,28rem)] overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-4 py-6 text-center text-[13px] text-ink-muted">{n.empty}</p>
            ) : (
              <>
                <Group title={n.overdue} items={overdue} tone="overdue" onPick={() => setOpen(false)} />
                <Group title={n.soon} items={soon} tone="soon" onPick={() => setOpen(false)} />
              </>
            )}
          </div>
          <Link href="/settings#deadlines" onClick={() => setOpen(false)} className="flex items-center gap-1.5 border-t border-line px-4 py-2.5 text-[12.5px] text-ink-muted hover:text-ink">
            <Settings className="size-3.5" />
            {n.settings}
          </Link>
        </div>
      )}
    </div>
  );
}

function Group({ title, items, tone, onPick }: { title: string; items: BellItem[]; tone: "soon" | "overdue"; onPick: () => void }) {
  if (items.length === 0) return null;
  return (
    <section>
      <h3
        className={clsx(
          "px-4 pt-3 pb-1 text-[10.5px] font-semibold tracking-[0.12em] uppercase",
          tone === "overdue" ? "text-danger" : "text-warn-ink",
        )}
      >
        {title} · {items.length}
      </h3>
      <ul>
        {items.map((item) => (
          <li key={item.id}>
            <Link href={item.href} onClick={onPick} className="flex items-start gap-3 px-4 py-2.5 hover:bg-surface-muted">
              <span className={clsx("mt-1.5 size-2 shrink-0 rounded-full", tone === "overdue" ? "bg-danger" : "bg-warn-ink")} />
              <span className="min-w-0 flex-1">
                <bdi className="block truncate text-[13.5px] font-medium">{item.childName}</bdi>
                <bdi className="block truncate text-[12.5px] text-ink-soft">{item.title}</bdi>
              </span>
              <span className={clsx("shrink-0 text-[12px]", tone === "overdue" ? "text-danger" : "text-warn-ink")}>{item.dueLabel}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
