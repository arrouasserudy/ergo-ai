"use client";

import { X } from "lucide-react";
import { useTransition } from "react";
import { setHomeCardHidden } from "@/app/actions/settings";
import { Button } from "@/components/ui/Button";

/** Hides an optional home page card (it can be shown again from the settings). */
export function HideCardButton({ card, label }: { card: "week" | "guide"; label: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button variant="ghost" size="sm" disabled={pending} onClick={() => startTransition(() => setHomeCardHidden(card, true))}>
      <X className="size-3.5" />
      {label}
    </Button>
  );
}
