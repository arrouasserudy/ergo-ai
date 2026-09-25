"use client";

import { Check } from "lucide-react";
import { useActionState } from "react";
import { saveLetterhead } from "@/app/actions/account";
import type { FormState } from "@/app/actions/children";
import { Button } from "@/components/ui/Button";
import { TextareaField } from "@/components/ui/Field";
import { useI18n } from "@/i18n/client";

export function LetterheadForm({ letterhead }: { letterhead: string | null }) {
  const { t } = useI18n();
  const [state, action, pending] = useActionState<FormState, FormData>(saveLetterhead, { ok: false });
  const values = (state.values ?? {}) as Record<string, string>;

  return (
    <form action={action} noValidate className="space-y-3">
      <TextareaField
        name="letterhead"
        label={t.fields.letterhead}
        placeholder={t.fields.letterheadPlaceholder}
        defaultValue={values.letterhead ?? letterhead ?? ""}
        error={state.errors?.letterhead}
        rows={4}
        maxLength={600}
      />
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
