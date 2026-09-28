import { Badge } from "@/components/ui/Badge";
import type { ChildFormStatus, FormTemplateStatus } from "@/db/schema";
import { getI18n } from "@/i18n/server";

const TEMPLATE_TONES = { draft: "warn", published: "ok", archived: "muted" } as const;
const CHILD_TONES = { draft: "warn", sent: "tint", submitted: "ok" } as const;

export async function TemplateStatusBadge({ status }: { status: FormTemplateStatus }) {
  const { t } = await getI18n();
  return <Badge tone={TEMPLATE_TONES[status]}>{t.forms.status[status]}</Badge>;
}

export async function ChildFormStatusBadge({ status }: { status: ChildFormStatus }) {
  const { t } = await getI18n();
  return <Badge tone={CHILD_TONES[status]}>{t.forms.childStatus[status]}</Badge>;
}
