import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

/** "‹ Section" link back to the parent page (the chevron flips in RTL). */
export function BackLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="-my-2 inline-flex min-h-11 items-center gap-1 text-[13.5px] text-ink-muted hover:text-ink">
      <ChevronLeft className="size-4 rtl:rotate-180" />
      {children}
    </Link>
  );
}
