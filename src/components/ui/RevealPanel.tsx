"use client";

import { Plus, X } from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { useI18n } from "@/i18n/client";

type RevealState = { open: boolean; setOpen: (open: boolean) => void };

const RevealContext = createContext<RevealState | null>(null);

function useReveal() {
  const ctx = useContext(RevealContext);
  if (!ctx) throw new Error("Reveal components must be inside <RevealProvider>");
  return ctx;
}

/** Shares the "panel open" state between the buttons that toggle it and the panel itself. */
export function RevealProvider({ children }: { children: ReactNode }) {
  const [open, setOpenState] = useState(false);
  const opener = useRef<HTMLElement | null>(null);
  const setOpen = useCallback((next: boolean) => {
    if (next) {
      opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    } else {
      // Give focus back to the button that opened the panel.
      requestAnimationFrame(() => opener.current?.focus());
    }
    setOpenState(next);
  }, []);
  return <RevealContext value={{ open, setOpen }}>{children}</RevealContext>;
}

/** Primary action toggling the panel. */
export function RevealButton({ label, panelId, className }: { label: string; panelId: string; className?: string }) {
  const { open, setOpen } = useReveal();
  return (
    <Button className={className} aria-expanded={open} aria-controls={panelId} onClick={() => setOpen(!open)}>
      <Plus className="size-4" />
      {label}
    </Button>
  );
}

/** A card shown inline once its button is clicked; Escape or the X closes it, focus goes to its first file input. */
export function RevealPanel({ title, panelId, children }: { title: string; panelId: string; children: ReactNode }) {
  const { t } = useI18n();
  const { open, setOpen } = useReveal();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    ref.current?.querySelector<HTMLInputElement>('input[type="file"]')?.focus();
  }, [open]);

  if (!open) return null;
  return (
    <div
      id={panelId}
      ref={ref}
      onKeyDown={(e) => {
        if (e.key === "Escape") setOpen(false);
      }}
    >
      <Card>
        <CardHeader
          title={title}
          action={
            <button
              type="button"
              aria-label={t.common.cancel}
              title={t.common.cancel}
              onClick={() => setOpen(false)}
              className="grid size-11 -me-2 -mt-2 place-items-center rounded-xl text-ink-muted hover:bg-surface-muted hover:text-ink"
            >
              <X className="size-5" />
            </button>
          }
        />
        <div className="px-5 pb-5">{children}</div>
      </Card>
    </div>
  );
}
