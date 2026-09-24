"use server";

import { getChild } from "@/lib/children";
import { childContextText } from "@/lib/expert/child-context";
import { listChildEpisodes } from "@/lib/episodes";
import { requireTherapist } from "@/lib/session";
import { APP_TIME_ZONE } from "@/lib/time";

/** Exactly what would be shared with the assistant for this child (shown before sending). */
export async function previewChildContext(childId: string): Promise<string | null> {
  const { accountId } = await requireTherapist();
  const child = getChild(accountId, childId);
  if (!child) return null;
  return childContextText(child, listChildEpisodes(accountId, child.id, { limit: 20 }), APP_TIME_ZONE);
}
