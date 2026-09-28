"use client";

import { Check, Loader2 } from "lucide-react";
import { useState, useTransition } from "react";
import { setFormTemplateAutomation } from "@/app/actions/forms";
import { Card, CardHeader } from "@/components/ui/Card";
import { useI18n } from "@/i18n/client";

const select =
  "h-10 rounded-lg border border-line-strong bg-surface px-2 text-[14px] focus:border-primary focus:ring-2 focus:ring-primary/15 focus:outline-none disabled:opacity-50";

const DAYS_IN_MONTH = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const pad = (n: number) => String(n).padStart(2, "0");

type Props = { id: string; autoAssign: boolean; deadline: string | null; published: boolean };

/** Auto-assignment to every child and the yearly deadline of a library form (saved on change). */
export function FormAutomation({ id, autoAssign: initialAuto, deadline: initialDeadline, published }: Props) {
  const i18n = useI18n();
  const a = i18n.t.forms.automation;
  const [autoAssign, setAutoAssign] = useState(initialAuto);
  const [deadline, setDeadline] = useState(initialDeadline);
  const [state, setState] = useState<"idle" | "saved" | "error">("idle");
  const [pending, startTransition] = useTransition();
  const [month, day] = deadline ? deadline.split("-").map(Number) : [0, 0];

  const save = (next: { autoAssign: boolean; deadline: string | null }) => {
    setAutoAssign(next.autoAssign);
    setDeadline(next.deadline);
    startTransition(async () => {
      const result = await setFormTemplateAutomation(id, next);
      setState(result.ok ? "saved" : "error");
    });
  };
  const setDate = (m: number, d: number) => save({ autoAssign, deadline: m ? `${pad(m)}-${pad(Math.min(d || 1, DAYS_IN_MONTH[m - 1]))}` : null });

  return (
    <Card>
      <CardHeader
        title={a.title}
        action={
          <span role="status" className="flex items-center gap-1 text-[12px] text-ink-muted">
            {pending ? <Loader2 className="size-3 animate-spin" /> : state === "saved" ? <Check className="size-3" /> : null}
            {state === "saved" && !pending ? a.saved : state === "error" ? i18n.t.forms.errors.generic : ""}
          </span>
        }
      />
      <div className="grid gap-5 px-5 pb-5 md:grid-cols-2">
        <label className="flex items-start gap-2.5">
          <input
            type="checkbox"
            className="mt-0.5 size-5 shrink-0 accent-primary"
            checked={autoAssign}
            onChange={(e) => save({ autoAssign: e.target.checked, deadline })}
          />
          <span>
            <span className="block text-[14px] font-medium">{a.autoLabel}</span>
            <span className="block text-[12.5px] text-ink-muted">{a.autoHint}</span>
            {!published && <span className="mt-1 block text-[12px] text-warn-ink">{a.draftNote}</span>}
          </span>
        </label>
        <fieldset>
          <legend className="text-[14px] font-medium">{a.deadline}</legend>
          <div className="mt-1.5 flex flex-wrap gap-2">
            <select aria-label={a.month} className={select} value={month} onChange={(e) => setDate(Number(e.target.value), day)}>
              <option value={0}>{a.noDeadline}</option>
              {i18n.monthNames().map((name, i) => (
                <option key={name} value={i + 1}>
                  {name}
                </option>
              ))}
            </select>
            <select aria-label={a.day} className={select} value={day || 1} disabled={!month} onChange={(e) => setDate(month, Number(e.target.value))}>
              {Array.from({ length: month ? DAYS_IN_MONTH[month - 1] : 31 }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  {i + 1}
                </option>
              ))}
            </select>
          </div>
          <p className="mt-1 text-[12.5px] text-ink-muted">{a.deadlineHint}</p>
        </fieldset>
      </div>
    </Card>
  );
}
