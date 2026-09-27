"use client";

import { CircleAlert } from "lucide-react";
import { isolate } from "@/i18n";
import { useI18n } from "@/i18n/client";
import { findChildName } from "@/lib/reports/text";

/**
 * Warns when text about to be sent to the AI contains the child's name. The text is
 * left as the therapist wrote it. In hidden mode the name itself isn't repeated.
 */
export function NameWarning({ text, childName }: { text: string; childName: string }) {
  const { t, hideNames } = useI18n();
  const found = findChildName(text, childName);
  if (found.length === 0) return null;
  return (
    <p role="status" className="flex gap-1.5 rounded-lg border border-warn-ink/20 bg-warn px-3 py-2 text-[12.5px] text-warn-ink">
      <CircleAlert className="mt-0.5 size-3.5 shrink-0" />
      <span>
        {t.privacy.nameFound(hideNames ? null : found.map(isolate).join(", "))} {t.privacy.nameFoundHint}
      </span>
    </p>
  );
}
