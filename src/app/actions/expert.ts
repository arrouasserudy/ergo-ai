"use server";

import { getChild, listChildren } from "@/lib/children";
import { contextFor } from "@/lib/expert/context";
import { getConversation, listConversations, listMessages } from "@/lib/expert/conversations";
import { toDisplayTurns, type DisplayTurn } from "@/lib/expert/display";
import { getEpisode } from "@/lib/episodes";
import { requireTherapist } from "@/lib/session";

type ChildOption = { id: string; name: string };

/** Exactly what would be shared with the assistant for this child (shown before sending). */
export async function previewChildContext(childId: string, episodeId: string | null = null): Promise<string | null> {
  const { accountId } = await requireTherapist();
  const child = getChild(accountId, childId);
  if (!child) return null;
  return contextFor(accountId, child, episodeId);
}

/** The therapist's own conversations, most recent first (the chat's history list). */
export async function listMyConversations(): Promise<{ id: string; title: string }[]> {
  const { accountId, therapist } = await requireTherapist();
  return listConversations(accountId, therapist.id).map(({ id, title }) => ({ id, title }));
}

export type NewChatSetup = {
  childOptions: ChildOption[];
  child: ChildOption | null;
  /** Episode in progress of that child: sent as context, help asked right away. */
  liveEpisode: { id: string; kind: string } | null;
};

/** What a new conversation starts from: the active children to pick, a preselected one, an episode in progress. */
export async function newChatSetup(childId: string | null, episodeId: string | null = null): Promise<NewChatSetup> {
  const { accountId } = await requireTherapist();
  const childOptions = listChildren(accountId, { status: "active" }).map(({ id, name }) => ({ id, name }));
  const child = childId ? (childOptions.find((c) => c.id === childId) ?? null) : null;
  const episode = child && episodeId ? getEpisode(accountId, episodeId) : undefined;
  const liveEpisode = episode && episode.childId === child?.id && episode.status === "open" ? { id: episode.id, kind: episode.kind } : null;
  return { childOptions, child, liveEpisode };
}

export type OpenedConversation = { id: string; child: ChildOption | null; turns: DisplayTurn[] };

/** A stored conversation as the chat shows it (null when it is not this therapist's). */
export async function openConversation(id: string): Promise<OpenedConversation | null> {
  const { accountId, therapist } = await requireTherapist();
  const conversation = getConversation(accountId, therapist.id, id);
  if (!conversation) return null;
  const child = conversation.childId ? getChild(accountId, conversation.childId) : null;
  return {
    id: conversation.id,
    child: child ? { id: child.id, name: child.name } : null,
    turns: toDisplayTurns(listMessages(conversation.id), conversation.provider),
  };
}
