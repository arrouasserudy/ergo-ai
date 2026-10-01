"use client";

import { Check, Loader2 } from "lucide-react";
import { useState, useTransition } from "react";
import { updateDeadlineSettings } from "@/app/actions/account";
import { Button } from "@/components/ui/Button";
import { useI18n } from "@/i18n/client";

const control =
  "h-11 rounded-xl border border-line-strong bg-surface px-3 text-[14px] focus:border-primary focus:ring-2 focus:ring-primary/15 focus:outline-none";
const DAYS_IN_MONTH = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const pad = (n: number) => String(n).padStart(2, "0");

/** Cabinet-wide deadline settings: warning period and first day of the school year. */
export function DeadlineSettingsForm({ warnDays: initialWarn, schoolYearStart }: { warnDays: number; schoolYearStart: string }) {
  const i18n = useI18n();
  const { t } = i18n;
  const s = t.settings;
  const [warnDays, setWarnDays] = useState(String(initialWarn));
  const [month, setMonth] = useState(Number(schoolYearStart.slice(0, 2)));
  const [day, setDay] = useState(Number(schoolYearStart.slice(3)));
  const [state, setState] = useState<"idle" | "saved" | "error">("idle");
  const [pending, startTransition] = useTransition();

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const result = await updateDeadlineSettings({ warnDays: Number(warnDays), schoolYearStart: `${pad(month)}-${pad(Math.min(day, DAYS_IN_MONTH[month - 1]))}` });
      setState(result.ok ? "saved" : "error");
    });
  };

  return (
    <form onSubmit={save} className="space-y-4" onChange={() => setState("idle")}>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className="text-[12.5px] font-medium text-ink-soft">{s.warnDays}</span>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            max={90}
            required
            value={warnDays}
            onChange={(e) => setWarnDays(e.target.value)}
            className={`${control} w-28`}
          />
          <span className="text-[12px] text-ink-muted">{s.warnDaysHelp}</span>
        </label>
        <fieldset className="flex flex-col gap-1.5">
          <legend className="mb-1.5 text-[12.5px] font-medium text-ink-soft">{s.schoolYearStart}</legend>
          <div className="flex gap-2">
            <select aria-label={t.forms.automation.day} className={control} value={day} onChange={(e) => setDay(Number(e.target.value))}>
              {Array.from({ length: DAYS_IN_MONTH[month - 1] }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  {i + 1}
                </option>
              ))}
            </select>
            <select aria-label={t.forms.automation.month} className={control} value={month} onChange={(e) => setMonth(Number(e.target.value))}>
              {i18n.monthNames().map((name, i) => (
                <option key={name} value={i + 1}>
                  {name}
                </option>
              ))}
            </select>
          </div>
          <span className="text-[12px] text-ink-muted">{s.schoolYearStartHelp}</span>
        </fieldset>
      </div>
      <div className="flex items-center justify-end gap-3">
        <span role="status" className="flex items-center gap-1 text-[12.5px] text-ink-muted">
          {state === "saved" && (
            <>
              <Check className="size-3.5" />
              {s.deadlinesSaved}
            </>
          )}
          {state === "error" && <span className="text-danger">{t.errors.generic}</span>}
        </span>
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="size-4 animate-spin" />}
          {t.common.save}
        </Button>
      </div>
    </form>
  );
}
