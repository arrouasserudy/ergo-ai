"use client";

import { useActionState } from "react";
import { createGroup } from "@/app/actions/groups";
import type { FormState } from "@/app/actions/children";
import { Button } from "@/components/ui/Button";
import { FormError } from "@/components/ui/FormError";
import { RevealPanel } from "@/components/ui/RevealPanel";
import { useI18n } from "@/i18n/client";
import { GroupFields } from "./GroupFields";

export const NEW_GROUP_PANEL = "new-group";

/** The "New group" card of the groups page; on success the action opens the new group. */
export function NewGroupPanel() {
  const i18n = useI18n();
  const g = i18n.t.groups;
  const [state, action, pending] = useActionState<FormState, FormData>(createGroup, { ok: false });
  return (
    <RevealPanel title={g.newTitle} panelId={NEW_GROUP_PANEL}>
      <form action={action} noValidate className="space-y-5">
        <p className="-mt-2 text-[12.5px] text-ink-muted">{g.newHint}</p>
        <GroupFields values={state.values as Record<string, string> | undefined} errors={state.errors} />
        <FormError message={i18n.error(state.errors?.form)} />
        <div className="flex justify-end border-t border-line pt-4">
          <Button type="submit" disabled={pending}>
            {pending ? i18n.t.common.saving : g.create}
          </Button>
        </div>
      </form>
    </RevealPanel>
  );
}
