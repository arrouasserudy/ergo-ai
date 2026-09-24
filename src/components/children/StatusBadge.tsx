import { Badge } from "@/components/ui/Badge";
import type { ChildStatus } from "@/db/schema";
import { t } from "@/i18n/fr";

export function StatusBadge({ status }: { status: ChildStatus }) {
  return <Badge tone={status === "active" ? "ok" : "muted"}>{t.status[status]}</Badge>;
}
