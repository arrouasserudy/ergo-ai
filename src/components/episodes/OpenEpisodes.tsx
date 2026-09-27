import { ChevronRight, MessageCircle } from "lucide-react";
import Link from "next/link";
import type { Episode } from "@/db/schema";
import { getI18n } from "@/i18n/server";

/** Banner rows for entries still in progress, linking back to them. */
export async function OpenEpisodes({ items }: { items: { episode: Episode; child: { id: string; name: string } }[] }) {
  if (items.length === 0) return null;
  const i18n = await getI18n();
  const { t } = i18n;
  return (
    <ul className="space-y-2">
      {items.map(({ episode, child }) => (
        <li key={episode.id} className="flex flex-wrap items-stretch gap-2">
          <Link
            href={`/children/${child.id}/episodes/${episode.id}`}
            className="flex min-w-0 flex-1 items-center gap-3 rounded-xl border border-warn-ink/25 bg-warn px-4 py-3 text-warn-ink transition-colors hover:border-warn-ink/50"
          >
            <span className="size-2 shrink-0 animate-pulse rounded-full bg-warn-ink" />
            <span className="min-w-0 flex-1 text-[13.5px]">
              <bdi className="font-semibold">{i18n.childName(child)}</bdi> · {t.episodes.inProgress[episode.kind]}{" "}
              {t.episodes.since(i18n.time(episode.startedAt))}
              {episode.situation && ` · ${i18n.situation(episode.situation)}`}
            </span>
            <span className="flex items-center gap-0.5 text-[13px] font-medium">
              {t.episodes.resume}
              <ChevronRight className="size-4 rtl:rotate-180" />
            </span>
          </Link>
          <Link
            href={`/expert?child=${child.id}&episode=${episode.id}`}
            className="flex items-center gap-1.5 rounded-xl border border-line-strong bg-surface px-4 py-3 text-[13px] font-medium text-primary transition-colors hover:bg-surface-muted"
          >
            <MessageCircle className="size-4" />
            {t.episodes.askAmit}
          </Link>
        </li>
      ))}
    </ul>
  );
}
