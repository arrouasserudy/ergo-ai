"use client";

import clsx from "clsx";
import { Library, Plus } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@/i18n/client";

export function ConversationLinks({ items }: { items: { id: string; title: string }[] }) {
  const { t } = useI18n();
  const pathname = usePathname();

  return (
    <nav className="space-y-3">
      <Link
        href="/expert"
        className="flex items-center justify-center gap-1.5 min-h-11 rounded-lg bg-primary px-3 py-2 text-[14px] font-medium text-white hover:bg-primary-hover"
      >
        <Plus className="size-4" />
        {t.expert.newConversation}
      </Link>
      <Link
        href="/expert/library"
        aria-current={pathname === "/expert/library" ? "page" : undefined}
        className={clsx(
          "flex min-h-11 items-center gap-2 rounded-lg px-2.5 py-2 text-[14px]",
          pathname === "/expert/library" ? "bg-surface font-medium text-ink shadow-sm" : "text-ink-soft hover:bg-surface/70",
        )}
      >
        <Library className="size-4" />
        {t.expert.library.link}
      </Link>
      <div>
        <p className="mb-1.5 px-1 text-[10.5px] font-medium tracking-[0.12em] text-ink-muted uppercase">{t.expert.discussions}</p>
        {items.length === 0 ? (
          <p className="px-1 text-[12.5px] text-ink-muted">{t.expert.noConversations}</p>
        ) : (
          <ul className="space-y-0.5">
            {items.map((c) => {
              const active = pathname === `/expert/${c.id}`;
              return (
                <li key={c.id}>
                  <Link
                    href={`/expert/${c.id}`}
                    aria-current={active ? "page" : undefined}
                    dir="auto"
                    className={clsx(
                      "block truncate rounded-lg px-2.5 py-3 text-[14px]",
                      active ? "bg-surface font-medium text-ink shadow-sm" : "text-ink-soft hover:bg-surface/70",
                    )}
                  >
                    {c.title}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </nav>
  );
}
