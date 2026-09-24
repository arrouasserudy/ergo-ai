import clsx from "clsx";
import { ShieldCheck } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader } from "@/components/ui/Card";
import type { Episode, EpisodeKind } from "@/db/schema";
import { getI18n } from "@/i18n/server";
import { computePatterns } from "@/lib/episode-insights";
import { APP_TIME_ZONE } from "@/lib/time";

type PatternCardProps = { eyebrow: string; title: string; body: string; tone: "tint" | "warn" | "muted" };

function PatternCard({ eyebrow, title, body, tone }: PatternCardProps) {
  return (
    <div
      className={clsx(
        "rounded-lg p-3",
        tone === "tint" && "bg-tint text-tint-ink",
        tone === "warn" && "bg-warn text-warn-ink",
        tone === "muted" && "bg-muted-badge text-muted-badge-ink",
      )}
    >
      <p className="text-[10.5px] font-medium tracking-[0.1em] uppercase opacity-80">{eyebrow}</p>
      <p className="mt-0.5 text-[14px] font-semibold">{title}</p>
      <p className="mt-0.5 text-[12px] opacity-90">{body}</p>
    </div>
  );
}

/** The "what the history shows" column: patterns, then the A-B-C table. */
export async function HistoryPanel({
  episodes,
  kind,
  childId,
  currentId,
  title,
  limit = 8,
  showLinkToAll = true,
}: {
  episodes: Episode[];
  /** Crises and everyday difficulties are analysed separately. */
  kind: EpisodeKind;
  childId: string;
  currentId?: string;
  title?: string;
  limit?: number;
  showLinkToAll?: boolean;
}) {
  const i18n = await getI18n();
  const e = i18n.t.episodes;
  const closed = episodes.filter((ep) => ep.status === "closed" && ep.kind === kind);
  const patterns = computePatterns(closed, APP_TIME_ZONE);
  const cards: PatternCardProps[] = [];
  if (patterns.trigger)
    cards.push({ eyebrow: e.patternTrigger, title: i18n.cause(patterns.trigger.key), body: e.patternCount(patterns.trigger.count, patterns.total, kind), tone: "tint" });
  if (patterns.background)
    cards.push({ eyebrow: e.patternBackground, title: i18n.cause(patterns.background.key), body: e.patternCount(patterns.background.count, patterns.total, kind), tone: "warn" });
  if (patterns.timeOfDay)
    cards.push({
      eyebrow: e.patternTime,
      title: e.timeOfDay[patterns.timeOfDay.bucket],
      body: e.patternTimeCount(patterns.timeOfDay.count, patterns.timeOfDay.total, e.timeOfDay[patterns.timeOfDay.bucket], kind),
      tone: "muted",
    });
  if (patterns.helped)
    cards.push({ eyebrow: e.patternHelped, title: i18n.tag(patterns.helped.key), body: e.patternCount(patterns.helped.count, patterns.total, kind), tone: "tint" });

  const rows = closed.filter((ep) => ep.id !== currentId).slice(0, limit);
  const cols = e.columns;

  return (
    <Card>
      <CardHeader title={title ?? e.historyTitle} />
      <div className="space-y-4 px-5 pb-5">
        {closed.length === 0 ? (
          <p className="rounded-lg bg-surface-muted px-4 py-6 text-center text-[13px] text-ink-muted">{e.historyEmpty}</p>
        ) : (
          <>
            {cards.length > 0 ? (
              <div className="grid gap-2 sm:grid-cols-2">
                {cards.map((c) => (
                  <PatternCard key={c.eyebrow} {...c} />
                ))}
              </div>
            ) : (
              <p className="text-[12.5px] text-ink-muted">{e.patternsTooFew}</p>
            )}

            {rows.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[440px] text-start text-[12.5px]">
                  <thead>
                    <tr className="border-b border-line text-[10.5px] tracking-[0.1em] text-ink-muted uppercase">
                      <th className="py-2 pe-3 font-medium">{cols.date}</th>
                      <th className="py-2 pe-3 font-medium">{cols.before}</th>
                      <th className="py-2 pe-3 font-medium">{cols.episode}</th>
                      <th className="py-2 font-medium">{cols.helped}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line align-top">
                    {rows.map((ep) => (
                      <tr key={ep.id} className="hover:bg-surface-muted">
                        <td className="py-2.5 pe-3 whitespace-nowrap">
                          <Link href={`/children/${childId}/episodes/${ep.id}`} className="font-medium text-ink hover:text-primary">
                            {i18n.shortDate(ep.startedAt)}
                          </Link>
                          {ep.situation && (
                            <span className="mt-1 block">
                              <Badge tone="muted">{i18n.situation(ep.situation)}</Badge>
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 pe-3 text-ink-soft">
                          <bdi>{ep.antecedent || ep.causes.slice(0, 2).map(i18n.cause).join(", ") || "—"}</bdi>
                        </td>
                        <td className="py-2.5 pe-3 text-ink-soft">
                          <bdi>{ep.behavior || "—"}</bdi>
                        </td>
                        <td className="py-2.5 text-ink-soft">
                          <bdi>{ep.helped.map(i18n.tag).join(", ") || "—"}</bdi>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {showLinkToAll && closed.length > rows.length + (currentId ? 1 : 0) && (
              <Link href={`/children/${childId}/episodes`} className="text-[12.5px] font-medium text-primary hover:underline">
                {e.seeHistory}
              </Link>
            )}
          </>
        )}
        <p className="flex items-start gap-2 border-t border-line pt-3 text-[11.5px] text-ink-muted">
          <ShieldCheck className="mt-0.5 size-3.5 shrink-0" />
          <span>
            {e.guardrail} {e.abcNote}
          </span>
        </p>
      </div>
    </Card>
  );
}
