"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { useFormStatus } from "react-dom";
import { startAssessment } from "@/app/actions/assessments";
import { Button } from "@/components/ui/Button";
import { useI18n } from "@/i18n/client";
import { isolate } from "@/i18n";

const control =
  "h-9 min-w-0 rounded-xl border border-line-strong bg-surface px-2 text-[13px] focus:border-primary focus:ring-2 focus:ring-primary/15 focus:outline-none";

type Props = { definitionId: string; childOptions: { id: string; name: string }[]; initialChildId?: string };

/** Starts this test for a chosen child, with the same action as the child page's picker. */
export function StartForChild({ definitionId, childOptions, initialChildId = "" }: Props) {
  const { t } = useI18n();
  const a = t.assessments;
  const [childId, setChildId] = useState(initialChildId);
  const child = childOptions.find((c) => c.id === childId);

  return (
    <form action={startAssessment.bind(null, childId)} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="definitionId" value={definitionId} />
      <select value={childId} onChange={(e) => setChildId(e.target.value)} required aria-label={a.pickChild} dir="auto" className={`${control} max-w-56`}>
        <option value="" disabled>
          {a.addToChildPlaceholder}
        </option>
        {childOptions.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      <Submit label={child ? a.addToChild(isolate(child.name)) : a.addToChildPlaceholder} disabled={!child} />
    </form>
  );
}

function Submit({ label, disabled }: { label: string; disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={disabled || pending}>
      <Plus className="size-3.5" />
      {label}
    </Button>
  );
}
