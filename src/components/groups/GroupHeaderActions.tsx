"use client";

import { Pencil, Trash2, Users, X } from "lucide-react";
import { useActionState, useState } from "react";
import { deleteGroup, setGroupMembers, updateGroup } from "@/app/actions/groups";
import type { FormState } from "@/app/actions/children";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { FormError } from "@/components/ui/FormError";
import type { ChildGroup } from "@/db/schema";
import { useI18n } from "@/i18n/client";
import { GroupFields } from "./GroupFields";

export type MemberOption = { id: string; name: string; label: string; groupId: string | null; groupName: string | null };

type Panel = "edit" | "members" | null;

/** Edit / choose children / delete, on the group page; each opens an inline card under the header. */
export function GroupHeaderActions({ group, options, openMembers }: { group: ChildGroup; options: MemberOption[]; openMembers: boolean }) {
  const i18n = useI18n();
  const { t } = i18n;
  const g = t.groups;
  const [panel, setPanel] = useState<Panel>(openMembers ? "members" : null);

  const [editState, editAction, editPending] = useActionState<FormState, FormData>(async (prev, formData) => {
    const result = await updateGroup(group.id, prev, formData);
    if (result.ok) setPanel(null);
    return result;
  }, { ok: false });
  const [membersState, membersAction, membersPending] = useActionState<FormState, FormData>(async (prev, formData) => {
    const result = await setGroupMembers(group.id, prev, formData);
    if (result.ok) setPanel(null);
    return result;
  }, { ok: false });

  const close = (
    <button
      type="button"
      aria-label={t.common.cancel}
      title={t.common.cancel}
      onClick={() => setPanel(null)}
      className="grid size-11 -me-2 -mt-2 place-items-center rounded-xl text-ink-muted hover:bg-surface-muted hover:text-ink"
    >
      <X className="size-5" />
    </button>
  );

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" onClick={() => setPanel(panel === "members" ? null : "members")} aria-expanded={panel === "members"}>
          <Users className="size-4" />
          {g.manageMembers}
        </Button>
        <Button size="sm" variant="secondary" onClick={() => setPanel(panel === "edit" ? null : "edit")} aria-expanded={panel === "edit"}>
          <Pencil className="size-3.5" />
          {g.edit}
        </Button>
        <form
          action={deleteGroup.bind(null, group.id)}
          onSubmit={(e) => {
            if (!confirm(g.deleteConfirm)) e.preventDefault();
          }}
        >
          <Button size="sm" variant="ghost" type="submit" aria-label={g.delete} title={g.delete}>
            <Trash2 className="size-4" />
          </Button>
        </form>
      </div>

      {panel === "edit" && (
        <div className="basis-full">
          <Card>
            <CardHeader title={g.editTitle} action={close} />
            <form action={editAction} noValidate className="space-y-5 px-5 pb-5">
              <GroupFields values={(editState.values as Record<string, string> | undefined) ?? group} errors={editState.errors} />
              <FormError message={i18n.error(editState.errors?.form)} />
              <div className="flex justify-end gap-2 border-t border-line pt-4">
                <Button variant="secondary" onClick={() => setPanel(null)}>
                  {t.common.cancel}
                </Button>
                <Button type="submit" disabled={editPending}>
                  {editPending ? t.common.saving : t.common.save}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {panel === "members" && (
        <div className="basis-full">
          <Card>
            <CardHeader title={g.membersTitle} hint={g.membersHint} action={close} />
            <form action={membersAction} className="space-y-4 px-5 pb-5">
              <ul className="grid gap-1.5 sm:grid-cols-2">
                {options.map((child) => (
                  <li key={child.id}>
                    <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border border-line px-3 py-2 transition-colors hover:bg-surface-muted has-checked:border-primary/40 has-checked:bg-tint">
                      <input type="checkbox" name="childId" value={child.id} defaultChecked={child.groupId === group.id} className="size-5 shrink-0 accent-primary" />
                      <Avatar name={child.name} />
                      <span className="min-w-0">
                        <bdi className="block truncate text-[14px] font-medium">{child.label}</bdi>
                        {child.groupName && child.groupId !== group.id && (
                          <span className="block truncate text-[11.5px] text-ink-muted">{g.inOtherGroup(child.groupName)}</span>
                        )}
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
              <FormError message={i18n.error(membersState.errors?.form)} />
              <div className="flex justify-end gap-2 border-t border-line pt-4">
                <Button variant="secondary" onClick={() => setPanel(null)}>
                  {t.common.cancel}
                </Button>
                <Button type="submit" disabled={membersPending}>
                  {membersPending ? t.common.saving : g.saveMembers}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </>
  );
}
