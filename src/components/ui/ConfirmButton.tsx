"use client";

import { Loader2, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { Button } from "./Button";

/** A destructive action that asks for a second tap before running. */
export function ConfirmButton({ action, label, confirmLabel }: { action: () => Promise<void>; label: string; confirmLabel: string }) {
  const [armed, setArmed] = useState(false);
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={pending}
      onBlur={() => setArmed(false)}
      onClick={() => (armed ? startTransition(() => action()) : setArmed(true))}
      className={armed ? "text-danger hover:text-danger" : undefined}
    >
      {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
      {armed ? confirmLabel : label}
    </Button>
  );
}
