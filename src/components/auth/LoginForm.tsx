"use client";

import Link from "next/link";
import { useActionState } from "react";
import { login } from "@/app/actions/auth";
import type { FormState } from "@/app/actions/children";
import { Button } from "@/components/ui/Button";
import { InputField } from "@/components/ui/Field";
import { FormError } from "@/components/ui/FormError";
import { t } from "@/i18n/fr";

export function LoginForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(login, { ok: false });
  const values = (state.values ?? {}) as Record<string, string>;
  const errors = state.errors ?? {};

  return (
    <form action={action} noValidate className="space-y-4">
      <FormError message={errors.form} />
      <InputField name="email" type="email" label={t.fields.email} placeholder={t.fields.emailPlaceholder} autoComplete="email" defaultValue={values.email} error={errors.email} required />
      <InputField name="password" type="password" label={t.fields.password} autoComplete="current-password" error={errors.password} required />
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? t.auth.loggingIn : t.auth.loginButton}
      </Button>
      <p className="text-center text-[13px] text-ink-muted">
        {t.auth.noAccount}{" "}
        <Link href="/signup" className="font-medium text-primary hover:underline">
          {t.auth.toSignup}
        </Link>
      </p>
    </form>
  );
}
