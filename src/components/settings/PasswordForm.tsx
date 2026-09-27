"use client";

import { CheckCircle2 } from "lucide-react";
import { useActionState } from "react";
import type { FormState } from "@/app/actions/children";
import { changePassword } from "@/app/actions/settings";
import { Button } from "@/components/ui/Button";
import { InputField } from "@/components/ui/Field";
import { useI18n } from "@/i18n/client";

export function PasswordForm() {
  const { t } = useI18n();
  const f = t.fields;
  const [state, action, pending] = useActionState<FormState, FormData>(changePassword, { ok: false });
  const errors = state.errors ?? {};

  return (
    // Keyed on savedAt so a successful change clears the fields.
    <form key={state.savedAt} action={action} noValidate className="space-y-4">
      {state.ok && (
        <p role="status" className="flex items-center gap-2 rounded-lg bg-ok px-3 py-2 text-[13px] text-ok-ink">
          <CheckCircle2 className="size-4" />
          {t.settings.passwordChanged}
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-3">
        <InputField name="currentPassword" type="password" label={f.currentPassword} error={errors.currentPassword} autoComplete="current-password" required />
        <InputField name="newPassword" type="password" label={f.newPassword} help={f.passwordHelp} error={errors.newPassword} autoComplete="new-password" required />
        <InputField name="confirmPassword" type="password" label={f.confirmPassword} error={errors.confirmPassword} autoComplete="new-password" required />
      </div>
      <div className="flex justify-end">
        <Button type="submit" variant="secondary" disabled={pending}>
          {pending ? t.settings.changingPassword : t.settings.changePassword}
        </Button>
      </div>
    </form>
  );
}
