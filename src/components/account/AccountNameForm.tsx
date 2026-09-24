"use client";

import { Check } from "lucide-react";
import { useActionState } from "react";
import { renameAccount } from "@/app/actions/account";
import type { FormState } from "@/app/actions/children";
import { Button } from "@/components/ui/Button";
import { InputField } from "@/components/ui/Field";
import { t } from "@/i18n/fr";

export function AccountNameForm({ name }: { name: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(renameAccount, { ok: false });
  const values = (state.values ?? {}) as Record<string, string>;

  return (
    <form action={action} noValidate className="flex flex-col gap-3 sm:flex-row sm:items-start">
      <InputField name="name" label={t.fields.accountName} defaultValue={values.name ?? name} error={state.errors?.name} className="flex-1" maxLength={120} required />
      <div className="flex items-center gap-3 sm:mt-6.5">
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
