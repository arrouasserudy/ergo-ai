import "server-only";
import type { Child } from "@/db/schema";
import { childContextText, crisisContextText, type ChildContextExtras } from "@/lib/expert/child-context";
import { getEpisode, listChildEpisodes } from "@/lib/episodes";
import { childReportsWithVariants } from "@/lib/reports/queries";
import { APP_TIME_ZONE } from "@/lib/time";
import { childTimeline } from "@/lib/timeline/queries";

/**
 * What the assistant is told about a child: the crisis-help context when an episode
 * of this child is given (scoped by account), the general summary otherwise. Both
 * include the child's tests, latest report and form dates (every query scoped by account).
 */
export function contextFor(accountId: string, child: Child, episodeId: string | null): string {
  const episodes = listChildEpisodes(accountId, child.id, { limit: 30 });
  const episode = episodeId ? getEpisode(accountId, episodeId) : undefined;
  const current = episode?.childId === child.id ? episode : undefined;
  const extras: ChildContextExtras = { timeline: childTimeline(accountId, child), reports: childReportsWithVariants(accountId, child.id) };
  return current
    ? crisisContextText(child, current, episodes, APP_TIME_ZONE, new Date(), extras)
    : childContextText(child, episodes, APP_TIME_ZONE, extras);
}
