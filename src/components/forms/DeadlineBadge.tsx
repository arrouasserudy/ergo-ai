import { CalendarClock } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { getI18n } from "@/i18n/server";
import type { ChildUrgency } from "@/lib/forms/queries";

/** A child's forms due soon (orange) or overdue (red); nothing when all is well. */
export async function DeadlineBadge({ urgency }: { urgency: ChildUrgency | undefined }) {
  if (!urgency) return null;
  const { t } = await getI18n();
  return (
    <Badge tone={urgency.level === "overdue" ? "danger" : "warn"}>
      <CalendarClock className="me-1 size-3" />
      {t.forms.due.badge[urgency.level](urgency.count)}
    </Badge>
  );
}
