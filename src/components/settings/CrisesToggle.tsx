"use client";

import { useOptimistic, useTransition } from "react";
import { setCrisesEnabled } from "@/app/actions/account";
import { Switch } from "@/components/ui/Switch";
import { useI18n } from "@/i18n/client";

/** The crises module, on or off for the whole cabinet; only the owner can change it. */
export function CrisesToggle({
  enabled,
  canEdit,
}: {
  enabled: boolean;
  canEdit: boolean;
}) {
  const { t } = useI18n();
  const [shown, setShown] = useOptimistic(enabled);
  const [pending, startTransition] = useTransition();

  return (
    <Switch
      checked={shown}
      disabled={pending || !canEdit}
      onChange={(on) =>
        startTransition(async () => {
          setShown(on);
          await setCrisesEnabled(on);
        })
      }
      label={t.settings.crisesLabel}
      description={t.settings.crisesExample}
    />
  );
}
