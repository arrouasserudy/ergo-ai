import clsx from "clsx";
import { ClipboardList, Plus } from "lucide-react";
import Link from "next/link";
import { attachForm } from "@/app/actions/child-forms";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { getI18n } from "@/i18n/server";
import { completion } from "@/lib/forms/answers";
import { urgency, type Urgency } from "@/lib/forms/deadlines";
import { listChildForms, listTemplates } from "@/lib/forms/queries";
import { localToday } from "@/lib/time";
import { ChildFormStatusBadge } from "./TemplateStatusBadge";

/** " · Avant le 1 oct.", orange when due soon, red when overdue. */
async function DueLabel({ dueDate, level }: { dueDate: string; level: Urgency }) {
  const i18n = await getI18n();
  const due = i18n.t.forms.due;
  return (
    <span className={clsx(level === "overdue" && "font-medium text-danger", level === "soon" && "font-medium text-warn-ink")}>
      {" · "}
      {level === "overdue" ? due.overdue(i18n.date(dueDate)) : due.before(i18n.date(dueDate))}
    </span>
  );
}

/** "Forms and documents" card of the child's "Forms & tests" tab: attached forms and the picker to add one. */
export async function ChildFormsCard({ accountId, childId, archived, warnDays }: { accountId: string; childId: string; archived: boolean; warnDays: number }) {
  const i18n = await getI18n();
  const f = i18n.t.forms;
  const forms = listChildForms(accountId, childId);
  const today = localToday();
  const templates = archived ? [] : listTemplates(accountId, { publishedOnly: true });

  return (
    <Card>
      <CardHeader title={f.childCardTitle} hint={f.childCardHint} />
      {forms.length === 0 ? (
        <p className="px-5 pb-4 text-[13px] text-ink-muted">{f.childNone}</p>
      ) : (
        <ul className="divide-y divide-line border-y border-line">
          {forms.map((form) => (
            <li key={form.id}>
              <Link href={`/children/${childId}/forms/${form.id}`} className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-surface-muted">
                <ClipboardList className="size-4 shrink-0 text-ink-muted" />
                <span className="min-w-0 flex-1">
                  <bdi className="block truncate text-[14px] font-medium">{form.schema.title}</bdi>
                  <span className="block text-[12px] text-ink-muted">
                    {form.status === "submitted" && form.submittedAt
                      ? i18n.date(form.submittedAt.toISOString())
                      : f.progress(Math.round(completion(form.schema, form.answers) * 100))}
                    {form.dueDate && form.status !== "submitted" && <DueLabel dueDate={form.dueDate} level={urgency(form.dueDate, today, warnDays)} />}
                  </span>
                </span>
                <ChildFormStatusBadge status={form.status} />
              </Link>
            </li>
          ))}
        </ul>
      )}
      {!archived && (
        <div className="px-5 py-4">
          {templates.length === 0 ? (
            <p className="text-[12.5px] text-ink-muted">
              {f.noPublished}{" "}
              <Link href="/forms" className="font-medium text-primary hover:underline">
                {f.goToLibrary}
              </Link>
            </p>
          ) : (
            <form action={attachForm.bind(null, childId)} className="flex flex-wrap gap-2">
              <select
                name="templateId"
                required
                defaultValue=""
                aria-label={f.pickTemplate}
                className="h-9 min-w-0 flex-1 rounded-xl border border-line-strong bg-surface px-2 text-[13px] focus:border-primary focus:ring-2 focus:ring-primary/15 focus:outline-none"
              >
                <option value="" disabled>
                  {f.pickPlaceholder}
                </option>
                {templates.map((tpl) => (
                  <option key={tpl.id} value={tpl.id}>
                    {tpl.title}
                  </option>
                ))}
              </select>
              <Button type="submit" size="sm">
                <Plus className="size-3.5" />
                {f.addToChild}
              </Button>
            </form>
          )}
        </div>
      )}
    </Card>
  );
}
