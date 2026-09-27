import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import type { Episode } from "@/db/schema";
import { getI18n } from "@/i18n/server";

type Item = { episode: Episode; child: { id: string; name: string } };

/** Compact list of episodes; shows the child when listing across the account. */
export async function EpisodeList({ items, showChild = false }: { items: Item[]; showChild?: boolean }) {
  const i18n = await getI18n();
  const { t } = i18n;
  return (
    <ul className="divide-y divide-line">
      {items.map(({ episode, child }) => {
        const labels = [episode.situation && i18n.situation(episode.situation), ...episode.causes.slice(0, 3).map(i18n.cause)];
        const summary = [...new Set(labels.filter(Boolean))].join(" · ");
        return (
          <li key={episode.id}>
            <Link
              href={`/children/${child.id}/episodes/${episode.id}`}
              className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-surface-muted"
            >
              {showChild && <Avatar name={child.name} />}
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2 text-[13.5px]">
                  {showChild && <bdi className="font-medium">{i18n.childName(child)}</bdi>}
                  <Badge tone={episode.kind === "crisis" ? "warn" : "muted"}>{t.episodes.kind[episode.kind]}</Badge>
                  <span className="text-ink-muted">{i18n.dateTime(episode.startedAt)}</span>
                </span>
                {summary && <span className="mt-0.5 block truncate text-[12.5px] text-ink-soft">{summary}</span>}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
