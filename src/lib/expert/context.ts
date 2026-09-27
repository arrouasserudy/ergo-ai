import "server-only";
import type { Child } from "@/db/schema";
import { childContextText, crisisContextText } from "@/lib/expert/child-context";
import { getEpisode, listChildEpisodes } from "@/lib/episodes";
import { APP_TIME_ZONE } from "@/lib/time";

/**
 * What the assistant is told about a child: the crisis-help context when an episode
 * of this child is given (scoped by account), the general summary otherwise.
 */
export function contextFor(accountId: string, child: Child, episodeId: string | null): string {
  const episodes = listChildEpisodes(accountId, child.id, { limit: 30 });
  const episode = episodeId ? getEpisode(accountId, episodeId) : undefined;
  const current = episode?.childId === child.id ? episode : undefined;
  return current ? crisisContextText(child, current, episodes, APP_TIME_ZONE) : childContextText(child, episodes, APP_TIME_ZONE);
}
