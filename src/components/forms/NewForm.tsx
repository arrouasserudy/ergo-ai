"use client";

import { Plus, X } from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { FormUpload } from "@/components/forms/FormUpload";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { useI18n } from "@/i18n/client";

type NewFormState = { open: boolean; setOpen: (open: boolean) => void };

const NewFormContext = createContext<NewFormState | null>(null);

function useNewForm() {
  const ctx = useContext(NewFormContext);
  if (!ctx) throw new Error("NewForm components must be inside <NewFormProvider>");
  return ctx;
}

/** Shares the "import panel open" state between the header button, the empty state and the panel. */
export function NewFormProvider({ children }: { children: ReactNode }) {
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
  return <NewFormContext value={{ open, setOpen }}>{children}</NewFormContext>;
}

/** Primary action toggling the import panel. */
export function NewFormButton({ className }: { className?: string }) {
  const { t } = useI18n();
  const { open, setOpen } = useNewForm();
  return (
    <Button className={className} aria-expanded={open} aria-controls="new-form-panel" onClick={() => setOpen(!open)}>
      <Plus className="size-4" />
      {t.forms.newForm}
    </Button>
  );
}

/** The import card (file upload → AI conversion), shown inline once "New form" is clicked. */
export function NewFormPanel() {
  const { t } = useI18n();
  const { open, setOpen } = useNewForm();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    ref.current?.querySelector<HTMLInputElement>('input[type="file"]')?.focus();
  }, [open]);

  if (!open) return null;
  return (
    <div
      id="new-form-panel"
      ref={ref}
      onKeyDown={(e) => {
        if (e.key === "Escape") setOpen(false);
      }}
    >
      <Card>
        <CardHeader
          title={t.forms.uploadTitle}
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
        <div className="px-5 pb-5">
          <FormUpload />
        </div>
      </Card>
    </div>
  );
}
