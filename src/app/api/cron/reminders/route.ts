import { timingSafeEqual } from "node:crypto";
import { sendDueReminders } from "@/lib/meetings";
import { smsProvider } from "@/lib/sms";

/**
 * Sends the parents' SMS reminders that are due. Called every hour by the scheduled
 * GitHub workflow (.github/workflows/reminders.yml) with `Authorization: Bearer $CRON_SECRET`;
 * the request also wakes the machine when it is stopped.
 */
export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return Response.json({ error: "CRON_SECRET not set" }, { status: 503 });
  const given = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return new Response(null, { status: 401 });
  if (!smsProvider()) return Response.json({ sent: 0, failed: 0, note: "SMS provider not configured" });

  return Response.json(await sendDueReminders());
}
