"use client";

import clsx from "clsx";
import { X } from "lucide-react";
import { useActionState, useEffect, useRef, useState } from "react";
import { deleteChildEvent, saveChildEvent, type EventFormState } from "@/app/actions/child-events";
import { ConfirmButton } from "@/components/forms/ConfirmButton";
import { KIND_STYLES } from "@/components/timeline/kind-styles";
import { Button } from "@/components/ui/Button";
import { FieldShell, InputField, TextareaField } from "@/components/ui/Field";
import { useI18n } from "@/i18n/client";
import { CHILD_EVENT_KINDS, type ChildEventKind } from "@/db/schema";
import { DETAILS_MAX } from "@/lib/child-events/events";

export type ReportOption = { id: string; docType: string; sessionDate: string; status: string };
export type EditableEvent = { id: string; kind: ChildEventKind; date: string; time: string | null; reportId: string | null; details: string | null };

const control =
  "h-11 w-full rounded-xl border bg-surface px-3 text-[15px] text-ink transition-colors focus:border-primary focus:ring-2 focus:ring-primary/15 focus:outline-none";

/** Adds (no `event`) or edits an event of a child, in a modal. Closes itself once saved. */
export function EventDialog({
  childId,
  reports,
  event,
  defaultDate,
  onClose,
}: {
  childId: string;
  reports: ReportOption[];
  event?: EditableEvent;
  defaultDate: string;
  onClose: () => void;
}) {
  const i18n = useI18n();
  const { t } = i18n;
  const c = t.childEvents;
  const ref = useRef<HTMLDialogElement>(null);
  const [state, action, pending] = useActionState<EventFormState, FormData>(saveChildEvent.bind(null, childId, event?.id ?? null), { ok: false });
  const values = state.values;
  const [kind, setKind] = useState<ChildEventKind>((values?.kind as ChildEventKind) || event?.kind || "intake");

  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);
  useEffect(() => {
    if (state.ok) ref.current?.close();
  }, [state.ok, state.savedAt]);

  const errors = state.errors ?? {};
  const value = (field: keyof EditableEvent, fallback = "") => values?.[field] ?? (event?.[field] as string | null | undefined) ?? fallback;
  const isOther = kind === "other";
  const isReport = kind === "report_due";

  return (
    <dialog
      ref={ref}
      aria-labelledby="event-dialog-title"
      onClose={onClose}
      onClick={(e) => e.target === ref.current && ref.current?.close()}
      className="m-auto w-[min(32rem,calc(100vw-2rem))] rounded-2xl border border-line bg-surface p-0 text-ink shadow-pop backdrop:bg-ink/30 backdrop:backdrop-blur-[2px]"
    >
      <div className="flex items-center justify-between gap-2 border-b border-line px-5 py-3">
        <h2 id="event-dialog-title" className="text-[16px] font-semibold">
          {event ? c.editTitle : c.addTitle}
        </h2>
        <button type="button" onClick={() => ref.current?.close()} aria-label={t.calendar.close} className="grid size-10 place-items-center rounded-full text-ink-muted hover:bg-surface-muted">
          <X className="size-5" />
        </button>
      </div>

      <form action={action} noValidate className="max-h-[75dvh] space-y-4 overflow-y-auto px-5 py-4">
        <fieldset>
          <legend className="mb-1.5 text-[12.5px] font-medium text-ink-soft">{c.kindLabel}</legend>
          <div className="grid grid-cols-2 gap-2">
            {CHILD_EVENT_KINDS.map((k) => {
              const style = KIND_STYLES[k];
              const Icon = style.icon;
              return (
                <label
                  key={k}
                  className={clsx(
                    "flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-[13.5px] transition-colors has-focus-visible:ring-2 has-focus-visible:ring-primary/30",
                    kind === k ? "border-primary bg-tint font-medium text-tint-ink" : "border-line-strong hover:bg-surface-muted",
                  )}
                >
                  <input type="radio" name="kind" value={k} checked={kind === k} onChange={() => setKind(k)} className="sr-only" />
                  <span aria-hidden className={clsx("grid size-6 shrink-0 place-items-center rounded-full border", style.chip)}>
                    <Icon className="size-3.5" strokeWidth={2} />
                  </span>
                  {c.kind[k]}
                </label>
              );
            })}
          </div>
          {errors.kind && <p className="mt-1 text-[12px] text-danger">{i18n.error(errors.kind)}</p>}
        </fieldset>

        {isReport && (
          <FieldShell id="event-report" name="reportId" label={c.report} error={errors.reportId} required help={reports.length === 0 ? c.noReports : undefined}>
            <select
              id="event-report"
              name="reportId"
              required
              dir="auto"
              defaultValue={value("reportId")}
              disabled={reports.length === 0}
              aria-invalid={errors.reportId ? true : undefined}
              className={clsx(control, errors.reportId ? "border-danger" : "border-line-strong")}
            >
              <option value="">{c.reportPlaceholder}</option>
              {reports.map((r) => (
                <option key={r.id} value={r.id}>
                  {c.reportOption(t.reports.docType[r.docType] ?? r.docType, i18n.date(r.sessionDate), t.reports.status[r.status] ?? r.status)}
                </option>
              ))}
            </select>
          </FieldShell>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <InputField id="event-date" name="date" type="date" label={isReport ? c.dueDate : c.date} required defaultValue={value("date", defaultDate)} error={errors.date} />
          {!isReport && <InputField id="event-time" name="time" type="time" label={c.time} help={c.timeHint} defaultValue={value("time")} error={errors.time} />}
        </div>

        <TextareaField
          id="event-details"
          name="details"
          label={isOther ? c.details : c.notes}
          help={isOther ? c.detailsHint : c.notesHint}
          required={isOther}
          maxLength={DETAILS_MAX}
          rows={isOther ? 3 : 2}
          defaultValue={value("details")}
          error={errors.details}
        />

        {errors.form && <p className="text-[13px] text-danger">{i18n.error(errors.form)}</p>}

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-4">
          <div>
            {event && (
              <ConfirmButton
                label={c.delete}
                question={c.deleteQuestion}
                onConfirm={async () => {
                  await deleteChildEvent(event.id);
                  ref.current?.close();
                }}
              />
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => ref.current?.close()}>
              {t.common.cancel}
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? t.common.saving : c.save}
            </Button>
          </div>
        </div>
      </form>
    </dialog>
  );
}
