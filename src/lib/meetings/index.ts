import "server-only";
import { and, asc, desc, eq, gte, isNull, lt, lte } from "drizzle-orm";
import { db } from "@/db";
import { accounts, children, meetings, therapists, type Meeting } from "@/db/schema";
import { createI18n } from "@/i18n";
import { normalizePhone } from "@/lib/sms/phone";
import { phoneCountryCode, sendSms, smsProvider } from "@/lib/sms";
import { APP_TIME_ZONE } from "@/lib/time";
import { isReminderDue } from "./reminder-timing";

/** Every query here is scoped by `accountId`, except the cron's `sendDueReminders`. */

const childColumns = {
  id: children.id,
  name: children.name,
  birthDate: children.birthDate,
  parentName: children.parentName,
  parentPhone: children.parentPhone,
  smsReminders: children.smsReminders,
  smsLanguage: children.smsLanguage,
};

export type MeetingChild = { [K in keyof typeof childColumns]: (typeof children.$inferSelect)[K] };
export type MeetingItem = { meeting: Meeting; child: MeetingChild; therapist: string | null };

export function getMeeting(accountId: string, id: string) {
  return db.select().from(meetings).where(and(eq(meetings.id, id), eq(meetings.accountId, accountId))).get() ?? null;
}

export function listChildMeetings(accountId: string, childId: string): MeetingItem[] {
  return db
    .select({ meeting: meetings, child: childColumns, therapist: therapists.name })
    .from(meetings)
    .innerJoin(children, eq(children.id, meetings.childId))
    .leftJoin(therapists, eq(therapists.id, meetings.createdBy))
    .where(and(eq(meetings.accountId, accountId), eq(meetings.childId, childId)))
    .orderBy(desc(meetings.scheduledAt))
    .limit(50)
    .all();
}

/** Scheduled meetings of the account between two instants, soonest first. */
export function listScheduledMeetings(accountId: string, from: Date, to: Date): MeetingItem[] {
  return db
    .select({ meeting: meetings, child: childColumns, therapist: therapists.name })
    .from(meetings)
    .innerJoin(children, eq(children.id, meetings.childId))
    .leftJoin(therapists, eq(therapists.id, meetings.createdBy))
    .where(and(eq(meetings.accountId, accountId), eq(meetings.status, "scheduled"), gte(meetings.scheduledAt, from), lt(meetings.scheduledAt, to)))
    .orderBy(asc(meetings.scheduledAt))
    .all();
}

/** Why a meeting's parents can't get an SMS reminder, or null when they can. */
export function reminderBlocker(child: MeetingChild): "noPhone" | "invalidPhone" | "noConsent" | null {
  if (!child.parentPhone) return "noPhone";
  if (!normalizePhone(child.parentPhone, phoneCountryCode())) return "invalidPhone";
  if (!child.smsReminders) return "noConsent";
  return null;
}

/** The reminder text, in the parents' language. No child name: it goes through the SMS provider. */
export function reminderText(meeting: Pick<Meeting, "kind" | "scheduledAt" | "location">, child: MeetingChild, therapistName: string, practiceName: string) {
  const i18n = createI18n(child.smsLanguage, APP_TIME_ZONE);
  return i18n.t.sms.reminder({
    parent: child.parentName,
    kind: i18n.t.sms.kinds[meeting.kind],
    when: i18n.longDateTime(meeting.scheduledAt),
    therapist: therapistName,
    practice: practiceName,
    location: meeting.location,
  });
}

/** Everything needed to remind the parents of one meeting. */
export function reminderContext(accountId: string, meetingId: string) {
  const row = db
    .select({ meeting: meetings, child: childColumns, practice: accounts.name, therapist: therapists.name })
    .from(meetings)
    .innerJoin(children, eq(children.id, meetings.childId))
    .innerJoin(accounts, eq(accounts.id, meetings.accountId))
    .leftJoin(therapists, eq(therapists.id, meetings.createdBy))
    .where(and(eq(meetings.id, meetingId), eq(meetings.accountId, accountId)))
    .get();
  if (!row) return null;
  const phone = row.child.parentPhone ? normalizePhone(row.child.parentPhone, phoneCountryCode()) : null;
  const text = reminderText(row.meeting, row.child, row.therapist ?? "", row.practice);
  return { ...row, phone, text };
}

/** Sends the reminder through the SMS provider and records the outcome. */
export async function sendReminder(accountId: string, meetingId: string): Promise<"sent" | "failed" | "unavailable"> {
  const ctx = reminderContext(accountId, meetingId);
  if (!ctx || !ctx.phone || !smsProvider()) return "unavailable";
  try {
    await sendSms(ctx.phone, ctx.text);
    db.update(meetings)
      .set({ reminderSentAt: new Date(), reminderChannel: "sms", reminderError: null })
      .where(eq(meetings.id, meetingId))
      .run();
    return "sent";
  } catch (err) {
    console.error("[reminders] SMS failed", meetingId, err);
    db.update(meetings)
      .set({ reminderError: (err instanceof Error ? err.message : String(err)).slice(0, 300) })
      .where(eq(meetings.id, meetingId))
      .run();
    return "failed";
  }
}

/**
 * Called by the scheduled job (POST /api/cron/reminders, hourly): sends the reminders
 * that are due, for every account. A failed reminder is not retried automatically; the
 * therapist sees the error and can resend it.
 */
export async function sendDueReminders(now = new Date()) {
  const horizon = new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000);
  const candidates = db
    .select({ meeting: meetings, child: childColumns })
    .from(meetings)
    .innerJoin(children, eq(children.id, meetings.childId))
    .where(
      and(
        eq(meetings.status, "scheduled"),
        eq(meetings.remindParent, true),
        isNull(meetings.reminderSentAt),
        isNull(meetings.reminderError),
        gte(meetings.scheduledAt, now),
        lte(meetings.scheduledAt, horizon),
        eq(children.status, "active"),
      ),
    )
    .all()
    .filter(({ meeting, child }) => reminderBlocker(child) === null && isReminderDue(meeting.scheduledAt, now));

  const result = { sent: 0, failed: 0 };
  for (const { meeting } of candidates) {
    const outcome = await sendReminder(meeting.accountId, meeting.id);
    if (outcome === "sent") result.sent += 1;
    else if (outcome === "failed") result.failed += 1;
  }
  return result;
}
