"use client";

import { Check } from "lucide-react";
import { useActionState } from "react";
import type { FormState } from "@/app/actions/children";
import { updateProfile } from "@/app/actions/settings";
import { Button } from "@/components/ui/Button";
import { InputField } from "@/components/ui/Field";
import { useI18n } from "@/i18n/client";

export function ProfileForm({ name, email }: { name: string; email: string }) {
  const { t } = useI18n();
  const [state, action, pending] = useActionState<FormState, FormData>(updateProfile, { ok: false });
  const values = (state.values ?? {}) as Record<string, string>;

  return (
    <form action={action} noValidate className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <InputField name="name" label={t.fields.yourName} defaultValue={values.name ?? name} error={state.errors?.name} maxLength={120} autoComplete="name" required />
        <InputField name="email" type="email" label={t.fields.email} defaultValue={email} help={t.settings.emailHint} readOnly disabled />
      </div>
      <div className="flex items-center justify-end gap-3">
        {state.ok && !pending && (
          <span role="status" className="flex items-center gap-1 text-[12.5px] text-ok-ink">
            <Check className="size-3.5" />
            {t.account.saved}
          </span>
        )}
        <Button type="submit" variant="secondary" disabled={pending}>
          {pending ? t.common.saving : t.common.save}
        </Button>
      </div>
    </form>
  );
}
