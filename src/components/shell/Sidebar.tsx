"use client";

import clsx from "clsx";
import {
  Activity,
  Bell,
  FileText,
  Building2,
  ListChecks,
  Lock,
  LogOut,
  Menu,
  MessageCircle,
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
import { initialsOf } from "@/lib/child-name";
import type { Dictionary } from "@/i18n/fr";

type NavItem = { label: keyof Dictionary["nav"]; icon: LucideIcon; href: string };

const NAV: NavItem[] = [
  { label: "newReport", icon: Plus, href: "/reports/new" },
  { label: "reports", icon: ListChecks, href: "/reports" },
  { label: "children", icon: UserRound, href: "/children" },
  { label: "reminders", icon: Bell, href: "/reminders" },
  { label: "crises", icon: Activity, href: "/crises" },
  { label: "expert", icon: MessageCircle, href: "/expert" },
  { label: "account", icon: Building2, href: "/account" },
  { label: "settings", icon: Settings, href: "/settings" },
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

/** The longest matching href wins, so "/reports/new" doesn't also light up "/reports". */
function activeHrefOf(pathname: string) {
  return NAV.map((item) => item.href)
    .filter((href) => pathname.startsWith(href))
    .sort((a, b) => b.length - a.length)[0];
}

/** Pending items on the reminders entry. */
function CountBadge({ count, className }: { count: number; className?: string }) {
  if (count <= 0) return null;
  return (
    <span className={clsx("grid h-5 min-w-5 place-items-center rounded-full bg-warn px-1.5 text-[11px] font-semibold text-warn-ink tabular-nums", className)}>
      {count > 99 ? "99+" : count}
    </span>
  );
}

function NavList({ pathname, onNavigate, reminderCount }: { pathname: string; onNavigate?: () => void; reminderCount: number }) {
  const { t } = useI18n();
  const activeHref = activeHrefOf(pathname);
  return (
    <ul className="space-y-1">
      {NAV.map(({ label, icon: Icon, href }) => {
        const active = href === activeHref;
        return (
          <li key={label}>
            <Link
              href={href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={clsx(
                "flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-[14px] transition-colors",
                active ? "bg-sidebar-active text-white" : "text-sidebar-ink hover:bg-sidebar-hover hover:text-white",
              )}
            >
              <Icon className="size-[18px] shrink-0" strokeWidth={1.75} />
              <span className="truncate">{t.nav[label]}</span>
              {label === "reminders" && <CountBadge count={reminderCount} className="ms-auto" />}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/** Tablet rail: icon above a short label, always visible, one tap to any module. */
function RailList({ pathname, reminderCount }: { pathname: string; reminderCount: number }) {
  const { t } = useI18n();
  const activeHref = activeHrefOf(pathname);
  return (
    <ul className="space-y-1">
      {NAV.map(({ label, icon: Icon, href }) => {
        const active = href === activeHref;
        return (
          <li key={label}>
            <Link
              href={href}
              aria-current={active ? "page" : undefined}
              className={clsx(
                "relative flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl px-0.5 py-2 text-center text-[11px] leading-tight transition-colors",
                active ? "bg-sidebar-active text-white" : "text-sidebar-ink hover:bg-sidebar-hover hover:text-white",
              )}
            >
              <Icon className="size-5 shrink-0" strokeWidth={1.75} />
              <span className="line-clamp-2 hyphens-auto">{t.nav[label]}</span>
              {label === "reminders" && <CountBadge count={reminderCount} className="absolute end-3 top-1" />}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

type SidebarProps = { therapistName: string; accountName: string; reminderCount: number };

function Footer({ therapistName, accountName }: SidebarProps) {
  const { t } = useI18n();
  return (
    <div className="space-y-3">
      <Link
        href="/privacy"
        className="flex gap-2 rounded-lg bg-sidebar-active p-3 text-[11.5px] leading-relaxed text-sidebar-ink transition-colors hover:bg-sidebar-hover"
      >
        <Lock className="mt-0.5 size-3.5 shrink-0" strokeWidth={1.75} />
        <p>
          {t.app.privacyNote} <span className="underline underline-offset-2">{t.privacy.learnMore}</span>
        </p>
      </Link>
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
            className="grid size-11 place-items-center rounded-lg text-sidebar-muted transition-colors hover:bg-sidebar-hover hover:text-white"
          >
            <LogOut className="size-4" strokeWidth={1.75} />
          </button>
        </form>
      </div>
    </div>
  );
}

function RailFooter({ therapistName, accountName }: SidebarProps) {
  const { t } = useI18n();
  return (
    <div className="flex flex-col items-center gap-2">
      <Link
        href="/privacy"
        title={t.app.privacyNote}
        aria-label={t.privacy.learnMore}
        className="grid size-11 place-items-center rounded-lg text-sidebar-muted transition-colors hover:bg-sidebar-hover hover:text-white"
      >
        <Lock className="size-[18px]" strokeWidth={1.75} />
      </Link>
      <div className="flex w-full flex-col items-center gap-1 border-t border-sidebar-active pt-3" title={`${therapistName} · ${accountName}`}>
        <span aria-hidden dir="ltr" className="grid size-9 place-items-center rounded-full bg-sidebar-active text-[11px] font-medium text-white">
          {initialsOf(therapistName).join("")}
        </span>
        <form action={signOut}>
          <button
            type="submit"
            title={t.nav.signOut}
            aria-label={t.nav.signOut}
            className="grid size-11 place-items-center rounded-lg text-sidebar-muted transition-colors hover:bg-sidebar-hover hover:text-white"
          >
            <LogOut className="size-[18px] rtl:rotate-180" strokeWidth={1.75} />
          </button>
        </form>
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
      {/* Phone: top bar + drawer */}
      <header className="sticky top-0 z-30 flex items-center justify-between bg-sidebar px-4 pt-[max(0.5rem,env(safe-area-inset-top))] pb-2 md:hidden">
        <Logo />
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={t.nav.openMenu}
          className="relative grid size-11 place-items-center rounded-lg text-sidebar-ink hover:bg-sidebar-hover"
        >
          <Menu className="size-5" />
          <CountBadge count={props.reminderCount} className="absolute end-0 top-0" />
        </button>
      </header>

      {open && (
        <div className="fixed inset-0 z-40 md:hidden">
          <button type="button" aria-label={t.nav.closeMenu} className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <nav className="relative flex h-full w-72 max-w-[85%] flex-col gap-6 overflow-y-auto overscroll-contain bg-sidebar p-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))]">
            <div className="flex items-center justify-between">
              <Logo />
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={t.nav.closeMenu}
                className="grid size-11 place-items-center rounded-lg text-sidebar-ink hover:bg-sidebar-hover"
              >
                <X className="size-5" />
              </button>
            </div>
            <NavList pathname={pathname} onNavigate={() => setOpen(false)} reminderCount={props.reminderCount} />
            <div className="mt-auto">
              <Footer {...props} />
            </div>
          </nav>
        </div>
      )}

      {/* Tablet (portrait and landscape): icon rail, always visible */}
      <nav className="sticky top-0 hidden h-dvh w-28 shrink-0 flex-col gap-5 overflow-y-auto bg-sidebar px-1.5 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] md:flex xl:hidden">
        <Link href="/children" aria-label={t.app.name} className="mx-auto grid size-10 place-items-center rounded-lg bg-primary text-white">
          <FileText className="size-5" strokeWidth={2} />
        </Link>
        <RailList pathname={pathname} reminderCount={props.reminderCount} />
        <div className="mt-auto">
          <RailFooter {...props} />
        </div>
      </nav>

      {/* Desktop: full sidebar */}
      <nav className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col gap-7 overflow-y-auto bg-sidebar px-3 py-5 xl:flex">
        <div className="px-2">
          <Logo />
        </div>
        <NavList pathname={pathname} reminderCount={props.reminderCount} />
        <div className="mt-auto">
          <Footer {...props} />
        </div>
      </nav>
    </>
  );
}
