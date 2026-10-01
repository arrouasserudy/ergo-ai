"use client";

import { ExternalLink, Search } from "lucide-react";
import { useMemo, useState } from "react";
import type { SharedPaper } from "@/db/library";
import { useI18n } from "@/i18n/client";

/** The shared open-access papers Amit searches, with a client-side filter on title and authors. */
export function SharedPapers({ papers }: { papers: SharedPaper[] }) {
  const { t } = useI18n();
  const l = t.expert.library;
  const [query, setQuery] = useState("");

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return papers;
    return papers.filter((p) => p.title.toLowerCase().includes(q) || p.authors.toLowerCase().includes(q));
  }, [papers, query]);

  return (
    <>
      <div className="px-5 pb-3">
        <label className="relative block">
          <span className="sr-only">{l.papersFilter}</span>
          <Search className="pointer-events-none absolute top-1/2 start-3 size-4 -translate-y-1/2 text-ink-muted" />
          <input
            type="search"
            dir="auto"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={l.papersFilter}
            className="h-10 w-full rounded-xl border border-line-strong bg-surface pe-3 ps-9 text-[13.5px] placeholder:text-ink-muted/70 focus:border-primary focus:ring-2 focus:ring-primary/15 focus:outline-none"
          />
        </label>
      </div>
      {visible.length === 0 ? (
        <p className="border-t border-line px-5 py-4 text-[13px] text-ink-muted">{l.papersNoMatch}</p>
      ) : (
        <ul className="divide-y divide-line border-t border-line">
          {visible.map((p) => (
            <li key={p.sourceId} className="px-5 py-3">
              <a
                href={p.url}
                target="_blank"
                rel="noopener noreferrer"
                dir="ltr"
                className="group inline-flex max-w-full items-start gap-1.5 text-start text-[14px] font-medium hover:text-primary"
              >
                <span className="min-w-0">{p.title}</span>
                <ExternalLink className="mt-1 size-3 shrink-0 text-ink-muted group-hover:text-primary" aria-hidden />
                <span className="sr-only" dir="auto">{l.papersOpens}</span>
              </a>
              <span className="mt-0.5 block text-[12px] text-ink-muted">
                <bdi dir="ltr">{p.authors}</bdi>
                {p.year ? <> · <bdi dir="ltr">{p.year}</bdi></> : null} · <bdi dir="ltr">{p.license}</bdi>
              </span>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
