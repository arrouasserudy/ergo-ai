"use client";

import { useActionState } from "react";
import { createChild, type FormState } from "@/app/actions/children";
import { Button, LinkButton } from "@/components/ui/Button";
import { useI18n } from "@/i18n/client";
import { IdentityFields, type GroupOption } from "./SectionFields";

export function NewChildForm({ groups, groupId }: { groups: GroupOption[]; groupId?: string }) {
  const { t } = useI18n();
  const [state, action, pending] = useActionState<FormState, FormData>(createChild, { ok: false });

  return (
    <form action={action} noValidate className="space-y-6 px-5 pb-5">
      <IdentityFields child={state.values ?? { groupId: groupId ?? null }} errors={state.errors} groups={groups} />
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
