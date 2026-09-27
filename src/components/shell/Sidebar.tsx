"use client";

import clsx from "clsx";
import {
  Activity,
  FileText,
  LayoutTemplate,
  Building2,
  ListChecks,
  Lock,
  LogOut,
  Menu,
  MessageCircle,
  NotebookPen,
  Plus,
  Settings,
  UserRound,
  X,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { signOut } from "@/app/actions/auth";
import { useI18n } from "@/i18n/client";
import type { Dictionary } from "@/i18n/fr";
import { LocaleSwitcher } from "./LocaleSwitcher";

type NavItem = { label: keyof Dictionary["nav"]; icon: LucideIcon; href?: string };

const NAV: NavItem[] = [
  { label: "newReport", icon: Plus, href: "/reports/new" },
  { label: "reports", icon: ListChecks, href: "/reports" },
  { label: "children", icon: UserRound, href: "/children" },
  { label: "crises", icon: Activity, href: "/crises" },
  { label: "expert", icon: MessageCircle, href: "/expert" },
  { label: "account", icon: Building2, href: "/account" },
  { label: "settings", icon: Settings, href: "/settings" },
];

// Modules planned for later phases, shown disabled.
const UPCOMING: NavItem[] = [
  { label: "exercises", icon: NotebookPen },
  { label: "templates", icon: LayoutTemplate },
];

function Logo() {
  const { t } = useI18n();
  return (
    <Link href="/children" className="flex items-center gap-2.5">
      <span className="grid size-7 place-items-center rounded-md bg-primary text-white">
        <FileText className="size-4" strokeWidth={2} />
      </span>
      <span className="font-serif text-xl font-medium text-white">{t.app.name}</span>
    </Link>
  );
}

function NavList({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  const { t } = useI18n();
  return (
    <div className="space-y-5">
      <NavItems items={NAV} pathname={pathname} onNavigate={onNavigate} />
      <div>
        <p className="mb-1.5 px-3 text-[10px] font-medium tracking-[0.14em] text-sidebar-muted uppercase">{t.nav.soon}</p>
        <NavItems items={UPCOMING} pathname={pathname} />
      </div>
    </div>
  );
}

function NavItems({ items, pathname, onNavigate }: { items: NavItem[]; pathname: string; onNavigate?: () => void }) {
  const { t } = useI18n();
  // The longest matching href wins, so "/reports/new" doesn't also light up "/reports".
  const activeHref = items
    .map((item) => item.href)
    .filter((href): href is string => Boolean(href && pathname.startsWith(href)))
    .sort((a, b) => b.length - a.length)[0];
  return (
    <ul className="space-y-0.5">
      {items.map(({ label, icon: Icon, href }) => {
        const active = href !== undefined && href === activeHref;
        const content = (
          <>
            <Icon className="size-4 shrink-0" strokeWidth={1.75} />
            <span className="truncate">{t.nav[label]}</span>
          </>
        );
        const base = "flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px]";
        return (
          <li key={label}>
            {href ? (
              <Link
                href={href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={clsx(base, "transition-colors", active ? "bg-sidebar-active text-white" : "text-sidebar-ink hover:bg-sidebar-hover hover:text-white")}
              >
                {content}
              </Link>
            ) : (
              <span aria-disabled className={clsx(base, "cursor-default text-sidebar-muted")}>
                {content}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

type SidebarProps = { therapistName: string; accountName: string };

function Footer({ therapistName, accountName }: SidebarProps) {
  const { t } = useI18n();
  return (
    <div className="space-y-3">
      <div className="flex gap-2 rounded-lg bg-sidebar-active p-3 text-[11.5px] leading-relaxed text-sidebar-ink">
        <Lock className="mt-0.5 size-3.5 shrink-0" strokeWidth={1.75} />
        <p>{t.app.privacyNote}</p>
      </div>
      <div className="flex items-center gap-2 border-t border-sidebar-active px-1 pt-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-medium text-white">{therapistName}</p>
          <p className="truncate text-[11.5px] text-sidebar-muted">{accountName}</p>
        </div>
        <form action={signOut}>
          <button
            type="submit"
            title={t.nav.signOut}
            aria-label={t.nav.signOut}
            className="rounded-md p-2 text-sidebar-muted transition-colors hover:bg-sidebar-hover hover:text-white"
          >
            <LogOut className="size-4" strokeWidth={1.75} />
          </button>
        </form>
      </div>
      <div className="px-1">
        <LocaleSwitcher tone="dark" />
      </div>
    </div>
  );
}

export function Sidebar(props: SidebarProps) {
  const { t } = useI18n();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between bg-sidebar px-4 py-3 lg:hidden">
        <Logo />
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={t.nav.openMenu}
          className="rounded-md p-1.5 text-sidebar-ink hover:bg-sidebar-hover"
        >
          <Menu className="size-5" />
        </button>
      </header>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button type="button" aria-label={t.nav.closeMenu} className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <nav className="relative flex h-full w-72 max-w-[85%] flex-col gap-6 bg-sidebar p-4">
            <div className="flex items-center justify-between">
              <Logo />
              <button type="button" onClick={() => setOpen(false)} aria-label={t.nav.closeMenu} className="rounded-md p-1.5 text-sidebar-ink hover:bg-sidebar-hover">
                <X className="size-5" />
              </button>
            </div>
            <NavList pathname={pathname} onNavigate={() => setOpen(false)} />
            <div className="mt-auto">
              <Footer {...props} />
            </div>
          </nav>
        </div>
      )}

      {/* Desktop sidebar */}
      <nav className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col gap-7 bg-sidebar px-3 py-5 lg:flex">
        <div className="px-2">
          <Logo />
        </div>
        <NavList pathname={pathname} />
        <div className="mt-auto">
          <Footer {...props} />
        </div>
      </nav>
    </>
  );
}
