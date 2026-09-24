import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { chatMessages, conversations } from "@/db/schema";
import { getLocale } from "@/i18n/server";
import { getChild } from "@/lib/children";
import { childContextText } from "@/lib/expert/child-context";
import { DAILY_QUESTION_LIMIT, getConversation, listMessages, questionsToday } from "@/lib/expert/conversations";
import type { ChatEvent } from "@/lib/expert/events";
import { defaultProvider, providerAvailable, runProvider } from "@/lib/expert/providers";
import { ProviderUnavailableError } from "@/lib/expert/providers/types";
import { listChildEpisodes } from "@/lib/episodes";
import { getSession } from "@/lib/session";
import { APP_TIME_ZONE } from "@/lib/time";

const bodySchema = z.object({
  conversationId: z.string().uuid().nullable(),
  message: z.string().trim().min(1).max(4000),
  /** Only used when starting a conversation. */
  childId: z.string().uuid().nullable(),
});

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return new Response("Unauthorized", { status: 401 });
  const accountId = session.user.accountId as string;
  const therapistId = session.user.id;

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return new Response("Bad request", { status: 400 });
  const { message, childId } = parsed.data;

  const locale = await getLocale();
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: ChatEvent) => controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      try {
        // Load the conversation (private to this therapist); its provider is fixed at creation.
        let conversation = parsed.data.conversationId ? getConversation(accountId, therapistId, parsed.data.conversationId) : null;
        if (parsed.data.conversationId && !conversation) {
          send({ type: "error", code: "generic" });
          return;
        }
        const provider = conversation ? conversation.provider : defaultProvider();
        if (!provider || !providerAvailable(provider)) {
          send({ type: "error", code: "unavailable" });
          return;
        }
        if (questionsToday(accountId) >= DAILY_QUESTION_LIMIT) {
          send({ type: "error", code: "limit" });
          return;
        }

        const history = conversation ? listMessages(conversation.id).map((m) => ({ role: m.role, content: m.content })) : [];

        // Pseudonymized child context goes into the first message only (stable, cacheable prefix).
        let prompt = message;
        if (!conversation) {
          const child = childId ? getChild(accountId, childId) : null;
          if (child) prompt = `${childContextText(child, listChildEpisodes(accountId, child.id, { limit: 20 }), APP_TIME_ZONE)}\n\n${message}`;
          conversation = db
            .insert(conversations)
            .values({ accountId, therapistId, childId: child?.id ?? null, title: message.slice(0, 80), provider })
            .returning()
            .get();
          send({ type: "conversation", id: conversation.id });
        }
        const conversationId = conversation.id;

        const { newMessages, usage, refused } = await runProvider(provider, { history, prompt, locale, accountId, send });
        if (refused) send({ type: "refusal" });

        // Persist every new turn exactly as exchanged; usage goes on the final answer.
        const lastAssistant = newMessages.findLastIndex((m) => m.role === "assistant");
        db.transaction((tx) => {
          newMessages.forEach((m, i) => {
            tx.insert(chatMessages)
              .values({
                conversationId,
                accountId,
                role: m.role,
                content: m.content,
                isPrompt: i === 0,
                inputTokens: i === lastAssistant ? usage.input : null,
                outputTokens: i === lastAssistant ? usage.output : null,
                createdAt: new Date(Date.now() + i), // keeps insertion order
              })
              .run();
          });
          tx.update(conversations).set({ updatedAt: new Date() }).where(eq(conversations.id, conversationId)).run();
        });
        send({ type: "done" });
      } catch (err) {
        console.error("[expert] chat failed", err);
        send({ type: "error", code: err instanceof ProviderUnavailableError ? "unavailable" : "generic" });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "content-type": "application/x-ndjson; charset=utf-8", "cache-control": "no-store", "x-accel-buffering": "no" },
  });
}
