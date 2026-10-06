import { z } from "zod";
import { CLIENT_EVENTS, type EventName } from "@/lib/analytics/events";
import { APP_ROUTES } from "@/lib/analytics/routes";
import { recordUsage, type UsageRow } from "@/lib/analytics/track";
import { getSession } from "@/lib/session";

/** One batch from UsageTracker: route patterns and client event names only, never content. */
const bodySchema = z.object({
  events: z
    .array(
      z.discriminatedUnion("kind", [
        z.object({ kind: z.literal("page"), name: z.enum(APP_ROUTES) }),
        z.object({ kind: z.literal("event"), name: z.enum(CLIENT_EVENTS as [EventName, ...EventName[]]) }),
      ]),
    )
    .min(1)
    .max(50),
});

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return new Response(null, { status: 401 });

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return new Response(null, { status: 400 });

  recordUsage({ accountId: session.user.accountId as string, therapistId: session.user.id }, parsed.data.events as UsageRow[]);
  return new Response(null, { status: 204 });
}
