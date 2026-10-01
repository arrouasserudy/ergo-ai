"use client";

import clsx from "clsx";
import { ClipboardList, Gauge, Library, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@/i18n/client";
import type { Dictionary } from "@/i18n/fr";

type Tab = { label: keyof Dictionary["nav"]; icon: LucideIcon; href: string };

/** The sections grouped under the "Resources" sidebar item (see `Sidebar.tsx`). Their URLs stay as they were. */
export const RESOURCE_TABS: Tab[] = [
  { label: "forms", icon: ClipboardList, href: "/forms" },
  { label: "assessments", icon: Gauge, href: "/assessments" },
  { label: "library", icon: Library, href: "/expert/library" },
];

const isUnder = (pathname: string, href: string) => pathname === href || pathname.startsWith(`${href}/`);

/** Tab bar on top of every Resources page (index and detail): the section's tab stays active on its sub-pages. */
export function ResourcesTabs() {
  const { t } = useI18n();
  const pathname = usePathname();
  return (
    <nav aria-label={t.nav.resources} className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] md:mx-0 md:px-0">
      <ul className="inline-flex rounded-xl border border-line-strong bg-surface-muted p-0.5">
        {RESOURCE_TABS.map(({ label, icon: Icon, href }) => {
          const active = isUnder(pathname, href);
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
                <Icon className={clsx("size-4 shrink-0", active ? "text-primary" : "text-ink-muted")} strokeWidth={1.75} />
                {t.nav[label]}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
