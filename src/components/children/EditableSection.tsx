"use client";

import { Pencil, Plus } from "lucide-react";
import { useActionState, useState, type ReactNode } from "react";
import { updateChildSection, type FormState } from "@/app/actions/children";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import type { Child } from "@/db/schema";
import { useI18n } from "@/i18n/client";
import type { Section } from "@/lib/validation";
import { HistoryFields, IdentityFields, ParentsFields, SensoryFields } from "./SectionFields";

const FIELDS = { identity: IdentityFields, history: HistoryFields, sensory: SensoryFields, parents: ParentsFields };

type EditableSectionProps = {
  child: Child;
  section: Section;
  title: string;
  hint?: string;
  /** Shown instead of `children` when the section has no data yet. */
  empty?: { title: string; body: string };
  children: ReactNode;
};

/** A card that shows a read-only view and switches in place to its edit form. */
export function EditableSection({ child, section, title, hint, empty, children }: EditableSectionProps) {
  const { t } = useI18n();
  const [editing, setEditing] = useState(false);
  const [state, action, pending] = useActionState<FormState, FormData>(async (prev, formData) => {
    const result = await updateChildSection(child.id, section, prev, formData);
    if (result.ok) setEditing(false);
    return result;
  }, { ok: false });

  const Fields = FIELDS[section];

  return (
    <Card>
      <CardHeader
        title={title}
        hint={hint}
        action={
          !editing && !empty && (
            <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>
              <Pencil className="size-3.5" />
              {t.common.edit}
            </Button>
          )
        }
      />
      <div className="px-5 pb-5">
        {editing ? (
          <form action={action} noValidate className="space-y-5">
            <Fields child={{ ...child, ...state.values }} errors={state.errors} />
            <div className="flex justify-end gap-2 border-t border-line pt-4">
              <Button variant="secondary" onClick={() => setEditing(false)} disabled={pending}>
                {t.common.cancel}
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? t.common.saving : t.common.save}
              </Button>
            </div>
          </form>
        ) : empty ? (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="flex w-full items-center gap-3 rounded-lg border border-dashed border-line-strong bg-surface-muted px-4 py-4 text-start transition-colors hover:border-primary/40 hover:bg-tint"
          >
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-tint text-tint-ink">
              <Plus className="size-4" />
            </span>
            <span>
              <span className="block text-[13.5px] font-medium text-ink">{empty.title}</span>
              <span className="block text-[12.5px] text-ink-muted">{empty.body}</span>
            </span>
          </button>
        ) : (
          children
        )}
      </div>
    </Card>
  );
}
