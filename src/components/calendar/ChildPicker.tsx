"use client";

import clsx from "clsx";
import { Check, ChevronDown, Search, Users, X } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { useI18n } from "@/i18n/client";
import { ChildBadge } from "./ChildBadge";

export type PickerChild = { id: string; name: string; initials: string; archived: boolean };

type Props = {
  options: PickerChild[];
  selected: string[];
  onChange: (ids: string[]) => void;
  includeArchived: boolean;
  onIncludeArchivedChange: (value: boolean) => void;
};

/** Multi-select of children with search: "All children" when nothing is selected. */
export function ChildPicker({ options, selected, onChange, includeArchived, onIncludeArchivedChange }: Props) {
  const { t } = useI18n();
  const c = t.calendar;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const shown = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return options;
    const compact = term.replace(/[\s.]/g, "");
    return options.filter((o) => o.name.toLowerCase().includes(term) || o.initials.toLowerCase().includes(compact));
  }, [options, query]);

  const chosen = selected.map((id) => options.find((o) => o.id === id)).filter((o): o is PickerChild => Boolean(o));
  const toggle = (id: string) => onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  const label = chosen.length === 0 ? c.allChildren : chosen.length === 1 ? chosen[0].name : c.selectedChildren(chosen.length);

  return (
    <div ref={rootRef} className="relative flex min-w-0 flex-wrap items-center gap-2">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((v) => !v)}
        className={clsx(
          "inline-flex h-10 max-w-full min-w-0 items-center gap-2 rounded-xl border bg-surface px-3 text-[13.5px] transition-colors hover:bg-surface-muted",
          chosen.length ? "border-primary text-ink" : "border-line-strong text-ink-soft",
        )}
      >
        <Users className="size-4 shrink-0 text-ink-muted" />
        <span className="sr-only">{c.childrenLabel}</span>
        <bdi className="truncate font-medium">{label}</bdi>
        <ChevronDown className="size-4 shrink-0 text-ink-muted" />
      </button>

      {chosen.length > 1 &&
        chosen.map((o) => (
          <button
            key={o.id}
            type="button"
            onClick={() => toggle(o.id)}
            aria-label={c.removeChild(o.name)}
            className="inline-flex h-8 max-w-48 items-center gap-1.5 rounded-full border border-line-strong bg-surface ps-1 pe-2 text-[12.5px] text-ink-soft hover:bg-surface-muted"
          >
            <ChildBadge childId={o.id} initials={o.initials} />
            <bdi className="truncate">{o.name}</bdi>
            <X className="size-3.5 shrink-0 text-ink-muted" />
          </button>
        ))}

      {open && (
        <div
          id={listId}
          className="absolute start-0 top-11 z-30 w-[min(20rem,calc(100vw-2rem))] rounded-2xl border border-line bg-surface p-2 shadow-pop"
        >
          <label className="relative block">
            <span className="sr-only">{c.searchChildren}</span>
            <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted" />
            <input
              type="search"
              dir="auto"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={c.searchChildren}
              className="h-10 w-full rounded-xl border border-line-strong bg-surface ps-9 pe-3 text-[14px] placeholder:text-ink-muted/70 focus:border-primary focus:ring-2 focus:ring-primary/15 focus:outline-none"
            />
          </label>
          <ul className="mt-1 max-h-72 overflow-y-auto overscroll-contain py-1">
            <li>
              <Option checked={selected.length === 0} onClick={() => onChange([])}>
                <span className="font-medium">{c.allChildren}</span>
              </Option>
            </li>
            {shown.map((o) => (
              <li key={o.id}>
                <Option checked={selected.includes(o.id)} onClick={() => toggle(o.id)}>
                  <ChildBadge childId={o.id} initials={o.initials} />
                  <bdi className={clsx("truncate", o.archived && "text-ink-muted")}>{o.name}</bdi>
                </Option>
              </li>
            ))}
            {shown.length === 0 && <li className="px-3 py-2 text-[13px] text-ink-muted">{c.noChildMatch}</li>}
          </ul>
          <label className="mt-1 flex min-h-10 cursor-pointer items-center gap-2 border-t border-line px-3 pt-2 text-[13px] text-ink-soft">
            <input type="checkbox" checked={includeArchived} onChange={(e) => onIncludeArchivedChange(e.target.checked)} className="size-4 accent-primary" />
            {c.includeArchived}
          </label>
        </div>
      )}
    </div>
  );
}

function Option({ checked, onClick, children }: { checked: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={checked}
      onClick={onClick}
      className={clsx("flex min-h-10 w-full items-center gap-2 rounded-lg px-3 text-start text-[13.5px] transition-colors hover:bg-surface-muted", checked && "bg-tint/60")}
    >
      <span className={clsx("grid size-4 shrink-0 place-items-center rounded border", checked ? "border-primary bg-primary text-primary-ink" : "border-line-strong")}>
        {checked && <Check className="size-3" strokeWidth={3} />}
      </span>
      {children}
    </button>
  );
}
