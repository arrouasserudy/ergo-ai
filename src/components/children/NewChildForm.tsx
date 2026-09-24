"use client";

import { useActionState } from "react";
import { createChild, type FormState } from "@/app/actions/children";
import { Button, LinkButton } from "@/components/ui/Button";
import { t } from "@/i18n/fr";
import { IdentityFields } from "./SectionFields";

export function NewChildForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(createChild, { ok: false });

  return (
    <form action={action} noValidate className="space-y-6 px-5 pb-5">
      <IdentityFields child={state.values} errors={state.errors} />
      <div className="flex justify-end gap-2 border-t border-line pt-4">
        <LinkButton href="/children" variant="secondary">
          {t.common.cancel}
        </LinkButton>
        <Button type="submit" disabled={pending}>
          {pending ? t.common.saving : t.children.createButton}
        </Button>
      </div>
    </form>
  );
}
