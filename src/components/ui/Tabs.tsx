"use client";

import clsx from "clsx";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

/** `match`: other path prefixes that light up the tab (defaults to `href` alone). */
export type TabItem = { label: string; icon?: LucideIcon; href: string; match?: string[] };

const isUnder = (pathname: string, prefix: string) => pathname === prefix || pathname.startsWith(`${prefix}/`);

/** The tab with the longest matching prefix wins, so detail pages light up their section, not a shorter parent tab. */
export function activeTabHref(tabs: TabItem[], pathname: string): string | undefined {
  return tabs
    .flatMap((tab) => (tab.match ?? [tab.href]).map((prefix) => ({ href: tab.href, prefix })))
    .filter(({ prefix }) => isUnder(pathname, prefix))
    .sort((a, b) => b.prefix.length - a.prefix.length)[0]?.href;
}

/** A row of link tabs (segmented control look), horizontally scrollable on narrow screens. */
export function Tabs({ label, tabs }: { label: string; tabs: TabItem[] }) {
  const pathname = usePathname();
  const activeHref = activeTabHref(tabs, pathname);
  return (
    <nav aria-label={label} className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] md:mx-0 md:px-0">
      <ul className="inline-flex rounded-xl border border-line-strong bg-surface-muted p-0.5">
        {tabs.map(({ label: tabLabel, icon: Icon, href }) => {
          const active = href === activeHref;
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={clsx(
                  "flex h-10 items-center gap-2 rounded-[10px] px-3.5 text-[13.5px] whitespace-nowrap transition-colors",
                  active ? "bg-surface font-medium text-ink shadow-sm" : "text-ink-muted hover:text-ink",
                )}
              >
                {Icon && <Icon className={clsx("size-4 shrink-0", active ? "text-primary" : "text-ink-muted")} strokeWidth={1.75} />}
                {tabLabel}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
