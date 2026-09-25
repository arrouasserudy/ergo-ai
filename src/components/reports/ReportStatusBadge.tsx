"use client";

import { Badge } from "@/components/ui/Badge";
import type { ReportStatus } from "@/db/schema";
import { useI18n } from "@/i18n/client";

const TONES = { draft: "warn", validated: "ok", exported: "muted" } as const;

export function ReportStatusBadge({ status }: { status: ReportStatus }) {
  const { t } = useI18n();
  return <Badge tone={TONES[status]}>{t.reports.status[status]}</Badge>;
}
