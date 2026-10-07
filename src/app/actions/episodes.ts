"use server";

import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { episodes, type EpisodeKind } from "@/db/schema";
import { getChild } from "@/lib/children";
import { requireTherapist } from "@/lib/session";
import { episodeSchema, toFieldErrors, type EpisodeInput, type FieldErrors } from "@/lib/validation";
import { track } from "@/lib/analytics/track";

// Each action re-checks the session and scopes by account (actions are reachable by direct POST).

function revalidateEpisode(childId: string) {
  // The whole child file: its header, overview and crises tab.
  revalidatePath(`/children/${childId}`, "layout");
  revalidatePath("/crises");
}

/** Starts a crisis or everyday-difficulty entry now, or resumes the one already open. */
export async function startEpisode(childId: string, kind: EpisodeKind) {
  const { accountId, account, therapist } = await requireTherapist();
  if (kind !== "crisis" && kind !== "difficulty") throw new Error("Invalid kind");
  if (!account.crisesEnabled) redirect(`/children/${childId}`);
  const child = getChild(accountId, childId);
  if (!child) redirect("/crises");

  const open = db
    .select({ id: episodes.id })
    .from(episodes)
    .where(and(eq(episodes.accountId, accountId), eq(episodes.childId, childId), eq(episodes.kind, kind), eq(episodes.status, "open")))
    .get();

  const id =
    open?.id ??
    db
      .insert(episodes)
      .values({ accountId, childId, kind, recordedBy: therapist.id, startedAt: new Date() })
      .returning({ id: episodes.id })
      .get().id;
  if (!open) track({ accountId, therapist }, "episode.started", { kind });

  revalidateEpisode(childId);
  redirect(`/children/${childId}/episodes/${id}`);
}

export type SaveEpisodeResult = { ok: boolean; errors?: FieldErrors; savedAt?: number };

/** Autosave: called on every change while the entry is being filled in. */
export async function saveEpisode(id: string, data: EpisodeInput): Promise<SaveEpisodeResult> {
  const { accountId } = await requireTherapist();
  const parsed = episodeSchema.safeParse(data);
  if (!parsed.success) return { ok: false, errors: toFieldErrors(parsed.error) };

  const updated = db
    .update(episodes)
    .set(parsed.data)
    .where(and(eq(episodes.id, id), eq(episodes.accountId, accountId)))
    .returning({ childId: episodes.childId })
    .get();
  if (!updated) return { ok: false, errors: { form: "generic" } };

  revalidateEpisode(updated.childId);
  return { ok: true, savedAt: Date.now() };
}

/** Saves the last changes and closes the entry ("Crise terminée"). */
export async function finishEpisode(id: string, data: EpisodeInput): Promise<SaveEpisodeResult> {
  const saved = await saveEpisode(id, data);
  if (!saved.ok) return saved;

  const { accountId, therapist } = await requireTherapist();
  const now = new Date();
  const episode = db
    .update(episodes)
    .set({ status: "closed" })
    .where(and(eq(episodes.id, id), eq(episodes.accountId, accountId)))
    .returning({ childId: episodes.childId, kind: episodes.kind })
    .get();
  if (episode) track({ accountId, therapist }, "episode.finished", { kind: episode.kind });
  // Keep the original end time if the entry is re-finished after an edit.
  db.update(episodes)
    .set({ endedAt: now })
    .where(and(eq(episodes.id, id), eq(episodes.accountId, accountId), isNull(episodes.endedAt)))
    .run();

  revalidateEpisode(episode!.childId);
  redirect(`/children/${episode!.childId}/episodes`);
}

export async function deleteEpisode(id: string) {
  const { accountId } = await requireTherapist();
  const deleted = db
    .delete(episodes)
    .where(and(eq(episodes.id, id), eq(episodes.accountId, accountId)))
    .returning({ childId: episodes.childId })
    .get();
  if (!deleted) redirect("/crises");

  revalidateEpisode(deleted.childId);
  redirect(`/children/${deleted.childId}/episodes`);
}
