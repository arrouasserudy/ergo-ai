"use client";

import clsx from "clsx";
import {
  Activity,
  FileText,
  FolderOpen,
  Lock,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  UserRound,
  X,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { signOut } from "@/app/actions/auth";
import { useI18n } from "@/i18n/client";
import { initialsOf } from "@/lib/child-name";
import { RESOURCE_TABS } from "@/components/shell/ResourcesTabs";
import type { Dictionary } from "@/i18n/fr";

/** `match`: other path prefixes that light up the item (defaults to `href` alone). */
type NavItem = { label: keyof Dictionary["nav"]; icon: LucideIcon; href: string; match?: string[] };

const NAV: NavItem[] = [
  { label: "dashboard", icon: LayoutDashboard, href: "/" },
  { label: "children", icon: UserRound, href: "/children", match: ["/children", "/reports"] },
  { label: "crises", icon: Activity, href: "/crises" },
  { label: "resources", icon: FolderOpen, href: "/forms", match: RESOURCE_TABS.map((tab) => tab.href) },
  { label: "settings", icon: Settings, href: "/settings" },
];

function LogoMark({ size = "md" }: { size?: "md" | "lg" }) {
  return (
    <span
      className={clsx(
        "grid shrink-0 place-items-center rounded-xl bg-primary text-white shadow-[0_1px_2px_rgb(20_48_40/0.15)]",
        size === "md" ? "size-9" : "size-10",
      )}
    >
      <FileText className={size === "md" ? "size-[18px]" : "size-5"} strokeWidth={2} />
    </span>
  );
}

/** Cabinet name over the app name, as the header of the sidebar. */
function Logo({ accountName }: { accountName: string }) {
  const { t } = useI18n();
  return (
    <Link href="/" className="flex min-w-0 items-center gap-2.5">
      <LogoMark />
      <span className="min-w-0 leading-tight">
        <bdi className="block truncate text-[14px] font-semibold text-ink">{accountName}</bdi>
        <span className="block truncate text-[12px] text-sidebar-muted">{t.app.name}</span>
      </span>
    </Link>
  );
}

const matches = (pathname: string, prefix: string) => (prefix === "/" ? pathname === "/" : pathname === prefix || pathname.startsWith(`${prefix}/`));

/** The item with the longest matching prefix wins, so "/children/1" lights up "/children". "/" only matches itself. */
function activeHrefOf(pathname: string) {
  return NAV.flatMap((item) => (item.match ?? [item.href]).map((prefix) => ({ href: item.href, prefix })))
    .filter(({ prefix }) => matches(pathname, prefix))
    .sort((a, b) => b.prefix.length - a.prefix.length)[0]?.href;
}

function NavList({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  const { t } = useI18n();
  const activeHref = activeHrefOf(pathname);
  return (
    <ul className="space-y-0.5">
      {NAV.map(({ label, icon: Icon, href }) => {
        const active = href === activeHref;
        return (
          <li key={label}>
            <Link
              href={href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={clsx(
                "flex min-h-11 items-center gap-3 rounded-xl px-3 py-2 text-[14px] transition-colors",
                active ? "bg-sidebar-active font-medium text-ink" : "text-sidebar-ink hover:bg-sidebar-hover hover:text-ink",
              )}
            >
              <Icon className={clsx("size-[18px] shrink-0", active ? "text-primary" : "text-sidebar-muted")} strokeWidth={1.75} />
              <span className="truncate">{t.nav[label]}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/** Tablet rail: icon above a short label, always visible, one tap to any module. */
function RailList({ pathname }: { pathname: string }) {
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
                "flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl px-0.5 py-2 text-center text-[11px] leading-tight transition-colors",
                active ? "bg-sidebar-active font-medium text-ink" : "text-sidebar-ink hover:bg-sidebar-hover hover:text-ink",
              )}
            >
              <Icon className={clsx("size-5 shrink-0", active ? "text-primary" : "text-sidebar-muted")} strokeWidth={1.75} />
              <span className="line-clamp-2 hyphens-auto">{t.nav[label]}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

type SidebarProps = { therapistName: string; therapistEmail: string; accountName: string };

/** The phone header also holds the notification bell (on larger screens it sits above the page). */
type ShellProps = SidebarProps & { bell?: ReactNode };

function UserAvatar({ name }: { name: string }) {
  return (
    <span aria-hidden dir="ltr" className="grid size-9 shrink-0 place-items-center rounded-full border border-sidebar-line bg-surface text-[11.5px] font-semibold text-sidebar-ink">
      {initialsOf(name).join("")}
    </span>
  );
}

function SignOutButton() {
  const { t } = useI18n();
  return (
    <form action={signOut}>
      <button
        type="submit"
        title={t.nav.signOut}
        aria-label={t.nav.signOut}
        className="grid size-11 place-items-center rounded-xl text-sidebar-muted transition-colors hover:bg-sidebar-hover hover:text-ink"
      >
        <LogOut className="size-4 rtl:rotate-180" strokeWidth={1.75} />
      </button>
    </form>
  );
}

function Footer({ therapistName, therapistEmail }: SidebarProps) {
  const { t } = useI18n();
  return (
    <div className="space-y-3">
      <Link
        href="/privacy"
        className="flex gap-2 rounded-xl border border-sidebar-line bg-surface p-3 text-[11.5px] leading-relaxed text-sidebar-muted transition-colors hover:text-ink"
      >
        <Lock className="mt-0.5 size-3.5 shrink-0 text-primary" strokeWidth={1.75} />
        <p>
          {t.app.privacyNote} <span className="underline underline-offset-2">{t.privacy.learnMore}</span>
        </p>
      </Link>
      <div className="flex items-center gap-2.5 px-1">
        <UserAvatar name={therapistName} />
        <div className="min-w-0 flex-1 leading-tight">
          <p className="truncate text-[13px] font-medium text-ink">{therapistName}</p>
          <p className="truncate text-[11.5px] text-sidebar-muted">{therapistEmail}</p>
        </div>
        <SignOutButton />
      </div>
    </div>
  );
}

function RailFooter({ therapistName, therapistEmail }: SidebarProps) {
  const { t } = useI18n();
  return (
    <div className="flex flex-col items-center gap-2">
      <Link
        href="/privacy"
        title={t.app.privacyNote}
        aria-label={t.privacy.learnMore}
        className="grid size-11 place-items-center rounded-xl text-sidebar-muted transition-colors hover:bg-sidebar-hover hover:text-ink"
      >
        <Lock className="size-[18px]" strokeWidth={1.75} />
      </Link>
      <div className="flex w-full flex-col items-center gap-1 border-t border-sidebar-line pt-3" title={`${therapistName} · ${therapistEmail}`}>
        <UserAvatar name={therapistName} />
        <SignOutButton />
      </div>
    </div>
  );
}

export function Sidebar({ bell, ...props }: ShellProps) {
  const { t } = useI18n();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Phone: top bar + drawer */}
      <header className="sticky top-0 z-30 flex items-center justify-between gap-2 border-b border-sidebar-line bg-sidebar/90 px-4 pt-[max(0.5rem,env(safe-area-inset-top))] pb-2 backdrop-blur md:hidden">
        <Logo accountName={props.accountName} />
        <div className="flex items-center gap-1">
          {bell}
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label={t.nav.openMenu}
            className="grid size-11 place-items-center rounded-xl text-sidebar-ink hover:bg-sidebar-hover"
          >
            <Menu className="size-5" />
          </button>
        </div>
      </header>

      {open && (
        <div className="fixed inset-0 z-40 md:hidden">
          <button type="button" aria-label={t.nav.closeMenu} className="absolute inset-0 bg-ink/30 backdrop-blur-[2px]" onClick={() => setOpen(false)} />
          <nav className="relative flex h-full w-72 max-w-[85%] flex-col gap-6 overflow-y-auto overscroll-contain bg-sidebar p-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] shadow-pop">
            <div className="flex items-center justify-between gap-2">
              <Logo accountName={props.accountName} />
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={t.nav.closeMenu}
                className="grid size-11 shrink-0 place-items-center rounded-xl text-sidebar-ink hover:bg-sidebar-hover"
              >
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

      {/* Tablet (portrait and landscape): icon rail, always visible */}
      <nav className="sticky top-0 hidden h-dvh w-28 shrink-0 flex-col gap-5 overflow-y-auto border-e border-sidebar-line bg-sidebar px-1.5 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] md:flex xl:hidden">
        <Link href="/" aria-label={t.app.name} title={props.accountName} className="mx-auto">
          <LogoMark size="lg" />
        </Link>
        <RailList pathname={pathname} />
        <div className="mt-auto">
          <RailFooter {...props} />
        </div>
      </nav>

      {/* Desktop: full sidebar */}
      <nav className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col gap-6 overflow-y-auto border-e border-sidebar-line bg-sidebar px-3 py-4 xl:flex">
        <div className="px-1.5">
          <Logo accountName={props.accountName} />
        </div>
        <NavList pathname={pathname} />
        <div className="mt-auto">
          <Footer {...props} />
        </div>
      </nav>
    </>
  );
}
