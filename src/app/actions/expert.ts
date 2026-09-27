"use server";

import { getChild } from "@/lib/children";
import { contextFor } from "@/lib/expert/context";
import { requireTherapist } from "@/lib/session";

/** Exactly what would be shared with the assistant for this child (shown before sending). */
export async function previewChildContext(childId: string, episodeId: string | null = null): Promise<string | null> {
  const { accountId } = await requireTherapist();
  const child = getChild(accountId, childId);
  if (!child) return null;
  return contextFor(accountId, child, episodeId);
}
