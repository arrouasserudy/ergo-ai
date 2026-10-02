import clsx from "clsx";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { KIND_STYLES } from "@/components/timeline/kind-styles";
import type { Episode } from "@/db/schema";
import { getI18n } from "@/i18n/server";

type Item = { episode: Episode; child: { id: string; name: string } };

/** One discreet line summing up what is in progress, linking to the crises page. Nothing when none is open. */
export async function OpenEpisodesStrip({ items }: { items: Item[] }) {
  if (items.length === 0) return null;
  const i18n = await getI18n();
  const { t } = i18n;
  const crises = items.filter((i) => i.episode.kind === "crisis").length;
  const style = KIND_STYLES[crises > 0 ? "crisis" : "difficulty"];
  const children = [...new Map(items.map((i) => [i.child.id, i.child])).values()];

  return (
    <Link
      href="/crises"
      className={clsx(
        "flex min-w-0 items-center gap-2 rounded-lg border px-3 py-1.5 text-[12.5px] transition-colors hover:border-current/40",
        style.chip,
      )}
    >
      <span aria-hidden className={clsx("size-1.5 shrink-0 animate-pulse rounded-full", style.mark)} />
      <span className="shrink-0 font-medium">{t.episodes.openSummary(crises, items.length - crises)}</span>
      <span aria-hidden className="shrink-0 opacity-60">
        ·
      </span>
      <span className="min-w-0 flex-1 truncate opacity-80">
        {children.map((child, index) => (
          <span key={child.id}>
            {index > 0 && ", "}
            <bdi>{i18n.childName(child)}</bdi>
          </span>
        ))}
      </span>
      <ChevronRight aria-hidden className="size-3.5 shrink-0 rtl:rotate-180" />
    </Link>
  );
}
