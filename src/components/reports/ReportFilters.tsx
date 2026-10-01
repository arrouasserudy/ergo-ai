"use client";

import clsx from "clsx";
import { Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { REPORT_STATUSES } from "@/db/schema";
import { useI18n } from "@/i18n/client";
import type { ReportStatusFilter } from "@/lib/reports/queries";

const STATUSES: ReportStatusFilter[] = ["all", ...REPORT_STATUSES];

export function ReportFilters({ search, status, thisMonth }: { search: string; status: ReportStatusFilter; thisMonth: boolean }) {
  const { t } = useI18n();
  const r = t.reports;
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [query, setQuery] = useState(search);
  const [pending, startTransition] = useTransition();

  const navigate = (next: Record<string, string | null>) => {
    const sp = new URLSearchParams(params);
    for (const [key, value] of Object.entries(next)) {
      if (value) sp.set(key, value);
      else sp.delete(key);
    }
    const qs = sp.toString();
    startTransition(() => router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
  };

  // Debounce typing before updating the URL.
  useEffect(() => {
    if (query.trim() === search) return;
    const id = setTimeout(() => navigate({ q: query.trim() || null }), 250);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const control =
    "h-11 rounded-xl border border-line-strong bg-surface text-[14px] focus:border-primary focus:ring-2 focus:ring-primary/15 focus:outline-none";

  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <label className="relative flex-1">
        <span className="sr-only">{r.searchPlaceholder}</span>
        <Search className="pointer-events-none absolute top-1/2 start-3 size-4 -translate-y-1/2 text-ink-muted" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={r.searchPlaceholder}
          className={clsx(control, "w-full pe-3 ps-9 text-[14px] placeholder:text-ink-muted/70", pending && "opacity-80")}
        />
      </label>
      <select
        value={status}
        onChange={(e) => navigate({ status: e.target.value === "all" ? null : e.target.value })}
        aria-label={r.columns.status}
        className={clsx(control, "px-3")}
      >
        {STATUSES.map((s) => (
          <option key={s} value={s}>
            {r.statusFilter[s]}
          </option>
        ))}
      </select>
      <button
        type="button"
        aria-pressed={thisMonth}
        onClick={() => navigate({ month: thisMonth ? null : "1" })}
        className={clsx(control, "px-3.5 transition-colors", thisMonth ? "border-primary bg-tint font-medium text-tint-ink" : "hover:bg-surface-muted")}
      >
        {r.thisMonth}
      </button>
    </div>
  );
}
