"use client";

import clsx from "clsx";
import { Check, Loader2 } from "lucide-react";
import { useI18n } from "@/i18n/client";

export type SaveState = "idle" | "saving" | "saved" | "error";

/** Autosave status: "Enregistrement…" / "Enregistré" / error. */
export function SaveIndicator({ state }: { state: SaveState }) {
  const e = useI18n().t.episodes;
  if (state === "idle") return null;
  return (
    <span role="status" className={clsx("flex items-center gap-1 text-[12px]", state === "error" ? "text-danger" : "text-ink-muted")}>
      {state === "saving" && <Loader2 className="size-3 animate-spin" />}
      {state === "saved" && <Check className="size-3" />}
      {state === "saving" ? e.saving : state === "saved" ? e.saved : e.saveError}
    </span>
  );
}
