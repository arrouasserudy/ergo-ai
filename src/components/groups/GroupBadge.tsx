import clsx from "clsx";
import Link from "next/link";
import type { GroupColor } from "@/db/schema";
import { GROUP_COLOR_CLASSES } from "@/lib/groups/colors";

export function GroupDot({ color, className }: { color: GroupColor; className?: string }) {
  return <span aria-hidden className={clsx("inline-block size-2.5 shrink-0 rounded-full", GROUP_COLOR_CLASSES[color].dot, className)} />;
}

/** A child's group (classroom, place), in its color; a link to the group's overview when `href` is given. */
export function GroupBadge({ group, href }: { group: { name: string; color: GroupColor }; href?: string }) {
  const className = clsx(
    "inline-flex max-w-full items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11.5px] font-medium whitespace-nowrap ring-1 ring-inset",
    GROUP_COLOR_CLASSES[group.color].badge,
    href && "transition-opacity hover:opacity-80",
  );
  const content = (
    <>
      <GroupDot color={group.color} className="size-2" />
      <bdi className="truncate">{group.name}</bdi>
    </>
  );
  return href ? (
    <Link href={href} className={className}>
      {content}
    </Link>
  ) : (
    <span className={className}>{content}</span>
  );
}
