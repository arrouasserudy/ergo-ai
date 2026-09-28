"use client";

import { Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { useI18n } from "@/i18n/client";

/** A destructive action asked twice, inline (no browser dialog). */
export function ConfirmButton({ label, question, onConfirm }: { label: string; question: string; onConfirm: () => Promise<unknown> | void }) {
  const { t } = useI18n();
  const [asking, setAsking] = useState(false);
  const [pending, startTransition] = useTransition();

  if (!asking) {
    return (
      <Button variant="ghost" onClick={() => setAsking(true)}>
        <Trash2 className="size-4" />
        {label}
      </Button>
    );
  }
  return (
    <div role="alertdialog" className="flex flex-wrap items-center gap-2 rounded-lg border border-line bg-surface-muted p-2 text-[13px]">
      <span className="px-1">{question}</span>
      <Button variant="ghost" size="sm" onClick={() => setAsking(false)}>
        {t.common.cancel}
      </Button>
      <Button variant="secondary" size="sm" className="text-danger" disabled={pending} onClick={() => startTransition(async () => void (await onConfirm()))}>
        <Trash2 className="size-3.5" />
        {label}
      </Button>
    </div>
  );
}
