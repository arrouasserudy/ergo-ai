import clsx from "clsx";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { KIND_STYLES } from "@/components/timeline/kind-styles";
import { Avatar } from "@/components/ui/Avatar";
import type { Episode } from "@/db/schema";
import { getI18n } from "@/i18n/server";
import { localToday, minutesBetween } from "@/lib/time";

type Item = { episode: Episode; child: { id: string; name: string } };

/** Entries in progress grouped by child: one row per child, its open entries nested beneath. */
export async function OpenEpisodesByChild({ items }: { items: Item[] }) {
  const i18n = await getI18n();
  const { t } = i18n;
  const now = new Date();
  const today = localToday(now);
  /** "since 14:32 · 25 min" today; "since 26 Sept, 21:43" for an entry left open since an earlier day. */
  const elapsed = (startedAt: Date) => {
    if (localToday(startedAt) !== today) return t.episodes.since(i18n.dateTime(startedAt));
    const minutes = minutesBetween(startedAt, now);
    return `${t.episodes.since(i18n.time(startedAt))} · ${minutes < 60 ? t.episodes.minutes(minutes) : t.episodes.hours(Math.floor(minutes / 60))}`;
  };
  const groups = new Map<string, { child: Item["child"]; episodes: Episode[] }>();
  for (const { episode, child } of items) {
    const group = groups.get(child.id) ?? { child, episodes: [] };
    group.episodes.push(episode);
    groups.set(child.id, group);
  }

  return (
    <ul className="divide-y divide-line">
      {[...groups.values()].map(({ child, episodes }) => (
        <li key={child.id} className="px-5 py-3">
          <div className="flex items-center gap-3">
            <Avatar name={child.name} />
            <Link href={`/children/${child.id}`} className="min-w-0 flex-1 truncate text-[14px] font-medium hover:underline">
              <bdi>{i18n.childName(child)}</bdi>
            </Link>
            <span className="shrink-0 text-[12px] text-ink-muted">{t.episodes.openCount(episodes.length)}</span>
          </div>
          <ul className="ms-4 mt-2 space-y-1 border-s border-line ps-3">
            {episodes.map((episode) => {
              const style = KIND_STYLES[episode.kind];
              const Icon = style.icon;
              return (
                <li key={episode.id}>
                  <Link
                    href={`/children/${child.id}/episodes/${episode.id}`}
                    className="flex min-w-0 items-center gap-2.5 rounded-lg px-2 py-1.5 -ms-2 text-[13px] transition-colors hover:bg-surface-muted"
                  >
                    <span aria-hidden className={clsx("grid size-6 shrink-0 place-items-center rounded-full border", style.dot)}>
                      <Icon className="size-3.5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium">{t.episodes.kind[episode.kind]}</span>
                      <span className="block truncate text-[12px] text-ink-muted">
                        {elapsed(episode.startedAt)}
                        {episode.situation && (
                          <>
                            {" · "}
                            <bdi>{i18n.situation(episode.situation)}</bdi>
                          </>
                        )}
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-0.5 text-[12.5px] font-medium text-primary">
                      {t.episodes.resume}
                      <ChevronRight aria-hidden className="size-3.5 rtl:rotate-180" />
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </li>
      ))}
    </ul>
  );
}
