"use client";

import { Lock } from "lucide-react";
import Link from "next/link";
import { useI18n } from "@/i18n/client";

/** Marks what is sent to the AI; opens the privacy page (in a new tab, so no edit is interrupted). */
export function PrivacyBadge() {
  const { t } = useI18n();
  return (
    <Link
      href="/privacy#ai"
      target="_blank"
      title={t.privacy.badgeTitle}
      className="inline-flex shrink-0 items-center gap-1 rounded-full bg-ok px-2.5 py-0.5 text-[11.5px] font-medium text-ok-ink transition-opacity hover:opacity-80"
    >
      <Lock className="size-3" strokeWidth={2} />
      {t.privacy.badge}
    </Link>
  );
}
