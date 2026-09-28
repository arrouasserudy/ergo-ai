"use client";

import { Check } from "lucide-react";
import { useActionState } from "react";
import { saveDeadlines } from "@/app/actions/account";
import type { FormState } from "@/app/actions/children";
import { Button } from "@/components/ui/Button";
import { InputField } from "@/components/ui/Field";
import { MILESTONES, type Milestone } from "@/db/schema";
import { useI18n } from "@/i18n/client";

/** The cabinet's deadlines, shown as dates of the current school year. */
export function DeadlinesForm({ dates }: { dates: Record<Milestone, string> }) {
  const { t } = useI18n();
  const [state, action, pending] = useActionState<FormState, FormData>(saveDeadlines, { ok: false });
  const values = (state.values ?? {}) as Record<string, string>;

  return (
    <form action={action} noValidate className="space-y-3">
      <div className="grid gap-4 sm:grid-cols-3">
        {MILESTONES.map((m) => (
          <InputField key={m} name={m} type="date" label={t.reminders.milestone[m]} defaultValue={values[m] ?? dates[m]} error={state.errors?.[m]} required />
        ))}
      </div>
      <div className="flex items-center gap-3">
        <Button type="submit" variant="secondary" disabled={pending}>
          {pending ? t.common.saving : t.common.save}
        </Button>
        {state.ok && !pending && (
          <span className="flex items-center gap-1 text-[12.5px] text-ok-ink">
            <Check className="size-3.5" />
            {t.account.saved}
          </span>
        )}
      </div>
    </form>
  );
}
