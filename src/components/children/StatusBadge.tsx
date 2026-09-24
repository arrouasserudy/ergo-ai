import { Badge } from "@/components/ui/Badge";
import type { ChildStatus } from "@/db/schema";
import { getI18n } from "@/i18n/server";

export async function StatusBadge({ status }: { status: ChildStatus }) {
  const { t } = await getI18n();
  return <Badge tone={status === "active" ? "ok" : "muted"}>{t.status[status]}</Badge>;
}
