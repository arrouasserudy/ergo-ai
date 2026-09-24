"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signup } from "@/app/actions/auth";
import type { FormState } from "@/app/actions/children";
import { Button } from "@/components/ui/Button";
import { InputField } from "@/components/ui/Field";
import { FormError } from "@/components/ui/FormError";
import { t } from "@/i18n/fr";

const f = t.fields;

export function SignupForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(signup, { ok: false });
  const values = (state.values ?? {}) as Record<string, string>;
  const errors = state.errors ?? {};

  return (
    <form action={action} noValidate className="space-y-4">
      <FormError message={errors.form} />
      <InputField name="accountName" label={f.accountName} placeholder={f.accountNamePlaceholder} defaultValue={values.accountName} error={errors.accountName} autoComplete="organization" required />
      <InputField name="name" label={f.yourName} placeholder={f.therapistNamePlaceholder} defaultValue={values.name} error={errors.name} autoComplete="name" required />
      <InputField name="email" type="email" label={f.email} placeholder={f.emailPlaceholder} defaultValue={values.email} error={errors.email} autoComplete="email" required />
      <InputField name="password" type="password" label={f.password} help={f.passwordHelp} error={errors.password} autoComplete="new-password" required />
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? t.auth.signingUp : t.auth.signupButton}
      </Button>
      <p className="text-center text-[13px] text-ink-muted">
        {t.auth.hasAccount}{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          {t.auth.toLogin}
        </Link>
      </p>
    </form>
  );
}
