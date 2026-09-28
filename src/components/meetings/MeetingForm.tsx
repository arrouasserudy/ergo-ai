"use client";

import { useActionState } from "react";
import type { FormState } from "@/app/actions/children";
import { createMeeting, updateMeeting } from "@/app/actions/meetings";
import { Button } from "@/components/ui/Button";
import { InputField, TextareaField } from "@/components/ui/Field";
import { FormError } from "@/components/ui/FormError";
import { MEETING_KINDS, type MeetingKind } from "@/db/schema";
import { useI18n } from "@/i18n/client";

export type MeetingFormValues = {
  id: string;
  kind: MeetingKind;
  scheduledAtLocal: string;
  location: string | null;
  notes: string | null;
  remindParent: boolean;
};

type Props = { childId: string; meeting?: MeetingFormValues; defaultKind?: MeetingKind; onDone: () => void };

/** Adds a meeting to a child's record, or edits one (rescheduling re-arms the reminder). */
export function MeetingForm({ childId, meeting, defaultKind = "parent_guidance", onDone }: Props) {
  const i18n = useI18n();
  const m = i18n.t.meetings;
  const [state, action, pending] = useActionState<FormState, FormData>(async (prev, formData) => {
    const result = meeting ? await updateMeeting(meeting.id, prev, formData) : await createMeeting(childId, prev, formData);
    if (result.ok) onDone();
    return result;
  }, { ok: false });
  const values = (state.values ?? {}) as Record<string, string | boolean>;
  const errors = state.errors ?? {};
  const prefix = meeting ? `meeting-${meeting.id}` : `meeting-new-${childId}`;

  return (
    <form action={action} noValidate className="space-y-4">
      <FormError message={i18n.error(errors.form)} />
      <fieldset>
        <legend className="mb-1.5 text-[12.5px] font-medium text-ink-soft">{m.kindLabel}</legend>
        <div className="flex flex-wrap gap-2">
          {MEETING_KINDS.map((kind) => (
            <label
              key={kind}
              className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-line-strong px-3 py-2 text-[14px] has-checked:border-primary has-checked:bg-tint has-checked:text-tint-ink"
            >
              <input type="radio" name="kind" value={kind} defaultChecked={(values.kind ?? meeting?.kind ?? defaultKind) === kind} className="accent-primary" />
              {m.kind[kind]}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="grid gap-4 sm:grid-cols-2">
        <InputField
          id={`${prefix}-scheduledAt`}
          name="scheduledAt"
          type="datetime-local"
          label={m.scheduledAt}
          defaultValue={String(values.scheduledAt ?? meeting?.scheduledAtLocal ?? "")}
          error={errors.scheduledAt}
          required
        />
        <InputField
          id={`${prefix}-location`}
          name="location"
          label={m.location}
          placeholder={m.locationPlaceholder}
          defaultValue={String(values.location ?? meeting?.location ?? "")}
          error={errors.location}
          maxLength={120}
        />
        <TextareaField
          id={`${prefix}-notes`}
          name="notes"
          label={m.notes}
          defaultValue={String(values.notes ?? meeting?.notes ?? "")}
          error={errors.notes}
          className="sm:col-span-2"
          rows={2}
          maxLength={1000}
        />
      </div>
      <label className="flex items-start gap-3 text-[14px] text-ink-soft">
        <input
          type="checkbox"
          name="remindParent"
          defaultChecked={Boolean(values.remindParent ?? meeting?.remindParent ?? true)}
          className="mt-0.5 size-5 shrink-0 accent-primary"
        />
        {m.remindParent}
      </label>
      <div className="flex justify-end gap-2 border-t border-line pt-4">
        <Button variant="secondary" onClick={onDone} disabled={pending}>
          {i18n.t.common.cancel}
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? i18n.t.common.saving : meeting ? i18n.t.common.save : m.create}
        </Button>
      </div>
    </form>
  );
}
