"use client";

import clsx from "clsx";
import { Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { useI18n } from "@/i18n/client";
import type { StatusFilter } from "@/lib/children";

const FILTERS: StatusFilter[] = ["active", "archived", "all"];

export function ChildrenFilters({ search, status }: { search: string; status: StatusFilter }) {
  const { t } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [query, setQuery] = useState(search);
  const [pending, startTransition] = useTransition();

  const navigate = (next: { q?: string; status?: StatusFilter }) => {
    const sp = new URLSearchParams(params);
    if (next.q !== undefined) {
      if (next.q) sp.set("q", next.q);
      else sp.delete("q");
    }
    if (next.status !== undefined) {
      if (next.status === "active") sp.delete("status");
      else sp.set("status", next.status);
    }
    const qs = sp.toString();
    startTransition(() => router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
  };

  // Debounce typing before updating the URL.
  useEffect(() => {
    if (query.trim() === search) return;
    const id = setTimeout(() => navigate({ q: query.trim() }), 250);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <label className="relative flex-1">
        <span className="sr-only">{t.children.searchPlaceholder}</span>
        <Search className="pointer-events-none absolute top-1/2 start-3 size-4 -translate-y-1/2 text-ink-muted" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t.children.searchPlaceholder}
          className={clsx(
            "h-11 w-full rounded-lg border border-line-strong bg-surface pe-3 ps-9 text-[14px] placeholder:text-ink-muted/70 focus:border-primary focus:ring-2 focus:ring-primary/15 focus:outline-none",
            pending && "opacity-80",
          )}
        />
      </label>
      <div role="group" className="flex rounded-lg border border-line-strong bg-surface-muted p-0.5">
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            aria-pressed={status === f}
            onClick={() => navigate({ status: f })}
            className={clsx(
              "h-10 flex-1 rounded-md px-4 text-[13px] transition-colors sm:flex-none",
              status === f ? "bg-surface font-medium text-ink shadow-sm" : "text-ink-muted hover:text-ink",
            )}
          >
            {t.children.filter[f]}
          </button>
        ))}
      </div>
    </div>
  );
}
