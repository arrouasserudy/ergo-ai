"use client";

import { CheckCircle2, UserPlus } from "lucide-react";
import { useActionState } from "react";
import { addTherapist } from "@/app/actions/account";
import type { FormState } from "@/app/actions/children";
import { Button } from "@/components/ui/Button";
import { InputField } from "@/components/ui/Field";
import { useI18n } from "@/i18n/client";

export function AddTherapistForm() {
  const { t } = useI18n();
  const f = t.fields;
  const [state, action, pending] = useActionState<FormState, FormData>(addTherapist, { ok: false });
  const values = (state.values ?? {}) as Record<string, string>;
  const errors = state.errors ?? {};

  return (
    <form action={action} noValidate className="space-y-4">
      {state.ok && state.addedName && (
        <p role="status" className="flex items-center gap-2 rounded-lg bg-ok px-3 py-2 text-[13px] text-ok-ink">
          <CheckCircle2 className="size-4" />
          {t.account.added(state.addedName)}
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-3">
        <InputField id="new-therapist-name" name="name" label={f.therapistName} placeholder={f.therapistNamePlaceholder} defaultValue={values.name} error={errors.name} autoComplete="off" required />
        <InputField id="new-therapist-email" name="email" type="email" label={f.email} placeholder={f.emailPlaceholder} defaultValue={values.email} error={errors.email} autoComplete="off" required />
        <InputField id="new-therapist-password" name="password" type="text" label={f.temporaryPassword} help={f.passwordHelp} error={errors.password} autoComplete="off" required />
      </div>
      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          <UserPlus className="size-4" />
          {pending ? t.account.adding : t.account.addButton}
        </Button>
      </div>
    </form>
  );
}
