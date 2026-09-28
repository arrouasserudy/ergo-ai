import "server-only";
import type { Meeting } from "@/db/schema";
import type { MeetingFormValues } from "@/components/meetings/MeetingForm";
import { normalizePhone, smsHref } from "@/lib/sms/phone";
import { phoneCountryCode } from "@/lib/sms";
import { toLocalInput } from "@/lib/time";
import { reminderBlocker, reminderText, type MeetingItem } from ".";

/** What the meeting components need, prepared on the server (reminder text, SMS link). */
export type MeetingView = {
  meeting: Meeting;
  child: { id: string; name: string };
  form: MeetingFormValues;
  /** Scheduled and still ahead (computed here: client renders stay pure). */
  upcoming: boolean;
  reminder: { blocker: ReturnType<typeof reminderBlocker>; text: string; href: string | null };
};

export function meetingView({ meeting, child, therapist }: MeetingItem, practiceName: string, now = new Date()): MeetingView {
  const text = reminderText(meeting, child, therapist ?? "", practiceName);
  const phone = child.parentPhone ? normalizePhone(child.parentPhone, phoneCountryCode()) : null;
  return {
    meeting,
    child: { id: child.id, name: child.name },
    form: {
      id: meeting.id,
      kind: meeting.kind,
      scheduledAtLocal: toLocalInput(meeting.scheduledAt),
      location: meeting.location,
      notes: meeting.notes,
      remindParent: meeting.remindParent,
    },
    upcoming: meeting.status === "scheduled" && meeting.scheduledAt.getTime() > now.getTime(),
    reminder: { blocker: reminderBlocker(child), text, href: phone ? smsHref(phone, text) : null },
  };
}
