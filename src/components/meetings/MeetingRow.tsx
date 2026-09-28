"use client";

import clsx from "clsx";
import { Check, Loader2, MessageSquare, Pencil, RotateCcw, Send, Smartphone, X } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { deleteMeeting, markReminderSentFromPhone, sendMeetingReminder, setMeetingStatus } from "@/app/actions/meetings";
import { Badge } from "@/components/ui/Badge";
import { Button, buttonClass } from "@/components/ui/Button";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import { useI18n } from "@/i18n/client";
import type { MeetingView } from "@/lib/meetings/view";
import { MeetingForm } from "./MeetingForm";

/** One meeting with its SMS reminder status and actions. */
export function MeetingRow({ view, showChild = false, smsAuto }: { view: MeetingView; showChild?: boolean; smsAuto: boolean }) {
  const i18n = useI18n();
  const m = i18n.t.meetings;
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | undefined>();
  const { meeting, child, reminder, upcoming } = view;

  if (editing) {
    return (
      <div className="px-5 py-4">
        <p className="mb-3 text-[13px] font-medium">{m.editTitle}</p>
        <MeetingForm childId={child.id} meeting={view.form} onDone={() => setEditing(false)} />
      </div>
    );
  }

  const run = (fn: () => Promise<unknown>) => startTransition(async () => void (await fn()));
  const sendNow = () =>
    startTransition(async () => {
      const result = await sendMeetingReminder(meeting.id);
      setError(result.ok ? undefined : i18n.error(result.error));
    });

  let reminderLine: string | null = null;
  let reminderTone: "muted" | "ok" | "warn" = "muted";
  if (upcoming) {
    if (!meeting.remindParent) reminderLine = m.reminder.off;
    else if (reminder.blocker) [reminderLine, reminderTone] = [m.reminder.blocked[reminder.blocker], "warn"];
    else if (meeting.reminderSentAt)
      [reminderLine, reminderTone] = [(meeting.reminderChannel === "phone" ? m.reminder.sentPhone : m.reminder.sent)(i18n.dateTime(meeting.reminderSentAt)), "ok"];
    else if (meeting.reminderError) [reminderLine, reminderTone] = [m.reminder.failed, "warn"];
    else reminderLine = m.reminder.scheduled;
  }
  const canRemind = upcoming && meeting.remindParent && !reminder.blocker;

  return (
    <div className="space-y-2 px-5 py-3.5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2 text-[14px] font-medium">
            {m.kind[meeting.kind]}
            {showChild && (
              <Link href={`/children/${child.id}`} className="font-normal text-primary hover:underline">
                <bdi>{i18n.childName(child)}</bdi>
              </Link>
            )}
            {meeting.status !== "scheduled" && <Badge tone={meeting.status === "done" ? "ok" : "muted"}>{m.status[meeting.status]}</Badge>}
          </p>
          <p className="text-[12.5px] text-ink-muted">
            {i18n.longDateTime(meeting.scheduledAt)}
            {meeting.location && (
              <>
                {" · "}
                <bdi>{meeting.location}</bdi>
              </>
            )}
          </p>
          {meeting.notes && (
            <p dir="auto" className="mt-1 text-[13px] whitespace-pre-line text-ink-soft">
              {meeting.notes}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-1">
          {meeting.status === "scheduled" ? (
            <>
              <Button variant="secondary" size="sm" disabled={pending} onClick={() => run(() => setMeetingStatus(meeting.id, "done"))}>
                <Check className="size-3.5" />
                {m.markDone}
              </Button>
              <Button variant="ghost" size="sm" disabled={pending} onClick={() => run(() => setMeetingStatus(meeting.id, "cancelled"))}>
                <X className="size-3.5" />
                {m.cancelMeeting}
              </Button>
              <Button variant="ghost" size="sm" disabled={pending} onClick={() => setEditing(true)} aria-label={i18n.t.common.edit}>
                <Pencil className="size-3.5" />
              </Button>
            </>
          ) : (
            <Button variant="ghost" size="sm" disabled={pending} onClick={() => run(() => setMeetingStatus(meeting.id, "scheduled"))}>
              <RotateCcw className="size-3.5" />
              {m.reopen}
            </Button>
          )}
          <ConfirmButton action={() => deleteMeeting(meeting.id)} label={m.delete} confirmLabel={m.confirmDelete} />
        </div>
      </div>

      {reminderLine && (
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={clsx(
              "inline-flex items-center gap-1.5 text-[12.5px]",
              reminderTone === "ok" ? "text-ok-ink" : reminderTone === "warn" ? "text-warn-ink" : "text-ink-muted",
            )}
          >
            <MessageSquare className="size-3.5" />
            {reminderLine}
          </span>
          {canRemind && smsAuto && (
            <Button variant="ghost" size="sm" disabled={pending} onClick={sendNow}>
              {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5 rtl:-scale-x-100" />}
              {pending ? m.sending : m.sendNow}
            </Button>
          )}
          {canRemind && reminder.href && (
            <a href={reminder.href} onClick={() => run(() => markReminderSentFromPhone(meeting.id))} className={buttonClass("ghost", "sm")}>
              <Smartphone className="size-3.5" />
              {m.sendFromPhone}
            </a>
          )}
        </div>
      )}
      {error && <p className="text-[12px] text-danger">{error}</p>}
      {canRemind && (
        <details className="text-[12.5px] text-ink-muted">
          <summary className="cursor-pointer select-none">{m.showText}</summary>
          <p dir="auto" className="mt-1 rounded-lg bg-surface-muted px-3 py-2 text-ink-soft">
            {reminder.text}
          </p>
        </details>
      )}
    </div>
  );
}
