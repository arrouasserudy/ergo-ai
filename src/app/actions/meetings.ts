"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { children, meetings, MEETING_STATUSES, type MeetingStatus } from "@/db/schema";
import { getMeeting, sendReminder } from "@/lib/meetings";
import { requireTherapist } from "@/lib/session";
import { fromLocalInput } from "@/lib/time";
import { meetingSchema, toFieldErrors } from "@/lib/validation";
import type { FormState } from "./children";

// Meetings change the sidebar count and the reminders page: revalidate the whole app.
const refresh = () => revalidatePath("/", "layout");

function parseMeeting(formData: FormData) {
  const input = {
    kind: String(formData.get("kind") ?? ""),
    scheduledAt: String(formData.get("scheduledAt") ?? ""),
    location: String(formData.get("location") ?? ""),
    notes: String(formData.get("notes") ?? ""),
    remindParent: formData.get("remindParent") === "on",
  };
  const parsed = meetingSchema.safeParse(input);
  if (!parsed.success) return { error: { ok: false, errors: toFieldErrors(parsed.error), values: input } satisfies FormState };
  const scheduledAt = fromLocalInput(parsed.data.scheduledAt);
  if (!scheduledAt) return { error: { ok: false, errors: { scheduledAt: "invalidDate" }, values: input } satisfies FormState };
  return { data: { ...parsed.data, scheduledAt } };
}

export async function createMeeting(childId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const { accountId, therapist } = await requireTherapist();
  const child = db
    .select({ id: children.id })
    .from(children)
    .where(and(eq(children.id, childId), eq(children.accountId, accountId)))
    .get();
  if (!child) return { ok: false, errors: { form: "generic" } };

  const parsed = parseMeeting(formData);
  if (parsed.error) return parsed.error;
  db.insert(meetings).values({ ...parsed.data, accountId, childId, createdBy: therapist.id }).run();
  refresh();
  return { ok: true, savedAt: Date.now() };
}

/** Rescheduling resets the reminder, so the parents are reminded of the new time. */
export async function updateMeeting(meetingId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const { accountId } = await requireTherapist();
  const meeting = getMeeting(accountId, meetingId);
  if (!meeting) return { ok: false, errors: { form: "generic" } };

  const parsed = parseMeeting(formData);
  if (parsed.error) return parsed.error;
  const moved = parsed.data.scheduledAt.getTime() !== meeting.scheduledAt.getTime();
  db.update(meetings)
    .set({ ...parsed.data, ...(moved && { reminderSentAt: null, reminderChannel: null, reminderError: null }) })
    .where(eq(meetings.id, meeting.id))
    .run();
  refresh();
  return { ok: true, savedAt: Date.now() };
}

export async function setMeetingStatus(meetingId: string, status: MeetingStatus) {
  const { accountId } = await requireTherapist();
  if (!MEETING_STATUSES.includes(status)) return;
  db.update(meetings)
    .set({ status })
    .where(and(eq(meetings.id, meetingId), eq(meetings.accountId, accountId)))
    .run();
  refresh();
}

export async function deleteMeeting(meetingId: string) {
  const { accountId } = await requireTherapist();
  db.delete(meetings)
    .where(and(eq(meetings.id, meetingId), eq(meetings.accountId, accountId)))
    .run();
  refresh();
}

/** Sends the parents' SMS reminder now, through the server's SMS provider. */
export async function sendMeetingReminder(meetingId: string): Promise<{ ok: boolean; error?: string }> {
  const { accountId } = await requireTherapist();
  const outcome = await sendReminder(accountId, meetingId);
  refresh();
  if (outcome === "sent") return { ok: true };
  return { ok: false, error: outcome === "unavailable" ? "smsUnavailable" : "smsFailed" };
}

/** The therapist opened her own messaging app with the reminder: record it as sent. */
export async function markReminderSentFromPhone(meetingId: string) {
  const { accountId } = await requireTherapist();
  db.update(meetings)
    .set({ reminderSentAt: new Date(), reminderChannel: "phone", reminderError: null })
    .where(and(eq(meetings.id, meetingId), eq(meetings.accountId, accountId)))
    .run();
  refresh();
}
