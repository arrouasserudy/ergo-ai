import "server-only";
import { and, asc, count, desc, eq, gte } from "drizzle-orm";
import { db } from "@/db";
import { chatMessages, conversations } from "@/db/schema";

/** Conversations are private to the therapist who started them (and scoped to the account). */
export function listConversations(accountId: string, therapistId: string, limit = 50) {
  return db
    .select()
    .from(conversations)
    .where(and(eq(conversations.accountId, accountId), eq(conversations.therapistId, therapistId)))
    .orderBy(desc(conversations.updatedAt))
    .limit(limit)
    .all();
}

export function getConversation(accountId: string, therapistId: string, id: string) {
  return (
    db
      .select()
      .from(conversations)
      .where(and(eq(conversations.id, id), eq(conversations.accountId, accountId), eq(conversations.therapistId, therapistId)))
      .get() ?? null
  );
}

export function listMessages(conversationId: string) {
  return db.select().from(chatMessages).where(eq(chatMessages.conversationId, conversationId)).orderBy(asc(chatMessages.createdAt)).all();
}

/** Questions asked by the cabinet since midnight UTC (cost guard). */
export function questionsToday(accountId: string): number {
  const since = new Date();
  since.setUTCHours(0, 0, 0, 0);
  const row = db
    .select({ n: count() })
    .from(chatMessages)
    .where(and(eq(chatMessages.accountId, accountId), eq(chatMessages.isPrompt, true), gte(chatMessages.createdAt, since)))
    .get();
  return row?.n ?? 0;
}

export const DAILY_QUESTION_LIMIT = Number(process.env.EXPERT_DAILY_LIMIT ?? 100);
