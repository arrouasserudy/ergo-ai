import { ClipboardList } from "lucide-react";
import Link from "next/link";
import { NewFormButton, NewFormPanel, NewFormProvider } from "@/components/forms/NewForm";
import { TemplateStatusBadge } from "@/components/forms/TemplateStatusBadge";
import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader } from "@/components/ui/Card";
import { getI18n } from "@/i18n/server";
import { listTemplates } from "@/lib/forms/queries";
import { allFields } from "@/lib/forms/schema";
import { requireTherapist } from "@/lib/session";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: `${t.forms.listTitle} · ${t.app.name}` };
}

export default async function FormsPage() {
  const i18n = await getI18n();
  const f = i18n.t.forms;
  const { accountId } = await requireTherapist();
  const templates = listTemplates(accountId);

  return (
    <NewFormProvider>
      <div className="mx-auto max-w-6xl space-y-5">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-[28px] leading-tight font-semibold tracking-tight">{f.listTitle}</h1>
            <p className="mt-1 max-w-2xl text-[13px] text-ink-muted">{f.listSubtitle}</p>
          </div>
          <NewFormButton />
        </header>

        <NewFormPanel />

        <Card>
          <CardHeader title={f.libraryTitle} />
          {templates.length === 0 ? (
            <div className="flex flex-col items-start gap-3 px-5 pb-5">
              <p className="text-[13px] text-ink-muted">{f.empty}</p>
              <NewFormButton />
            </div>
          ) : (
            <ul className="divide-y divide-line border-t border-line">
              {templates.map((tpl) => (
                <li key={tpl.id}>
                  <Link href={`/forms/${tpl.id}`} className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-surface-muted">
                    <ClipboardList className="size-4 shrink-0 text-ink-muted" />
                    <span className="min-w-0 flex-1">
                      <bdi className="block truncate text-[14px] font-medium">{tpl.title}</bdi>
                      <span className="block text-[12px] text-ink-muted">
                        {f.questions(allFields(tpl.schema).filter((fl) => fl.type !== "info").length)} · {f.updated(i18n.date(tpl.updatedAt.toISOString()))}
                      </span>
                    </span>
                    {tpl.builtinKey && <Badge tone="muted">{f.builtin.badge}</Badge>}
                    {tpl.autoAssign && <Badge tone="tint">{f.automation.autoChip}</Badge>}
                    {tpl.deadline && <Badge tone="muted">{f.due.before(i18n.dayMonth(tpl.deadline))}</Badge>}
                    <TemplateStatusBadge status={tpl.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </NewFormProvider>
  );
}
