import { Badge } from "@/components/ui/Badge";
import type { AssessmentStatus } from "@/db/schema";
import { getI18n } from "@/i18n/server";

const TONES = { draft: "warn", sent: "tint", completed: "ok" } as const;

export async function AssessmentStatusBadge({ status }: { status: AssessmentStatus }) {
  const { t } = await getI18n();
  return <Badge tone={TONES[status]}>{t.assessments.status[status]}</Badge>;
}
