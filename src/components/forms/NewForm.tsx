"use client";

import { FormUpload } from "@/components/forms/FormUpload";
import { RevealButton, RevealPanel, RevealProvider } from "@/components/ui/RevealPanel";
import { useI18n } from "@/i18n/client";

const PANEL_ID = "new-form-panel";

/** Shares the "import panel open" state between the header button, the empty state and the panel. */
export const NewFormProvider = RevealProvider;

/** Primary action toggling the import panel. */
export function NewFormButton({ className }: { className?: string }) {
  const { t } = useI18n();
  return <RevealButton label={t.forms.newForm} panelId={PANEL_ID} className={className} />;
}

/** The import card (file upload → AI conversion), shown inline once "New form" is clicked. */
export function NewFormPanel() {
  const { t } = useI18n();
  return (
    <RevealPanel title={t.forms.uploadTitle} panelId={PANEL_ID}>
      <FormUpload />
    </RevealPanel>
  );
}
