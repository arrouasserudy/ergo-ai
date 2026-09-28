import { ChevronLeft, RotateCcw } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteChildForm, reopenChildForm } from "@/app/actions/child-forms";
import { ChildFormFill } from "@/components/forms/ChildFormFill";
import { ConfirmButton } from "@/components/forms/ConfirmButton";
import { FormRenderer } from "@/components/forms/FormRenderer";
import { PrintForm } from "@/components/forms/PrintForm";
import { SharePanel } from "@/components/forms/SharePanel";
import { ChildFormStatusBadge } from "@/components/forms/TemplateStatusBadge";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { getI18n } from "@/i18n/server";
import { getChild } from "@/lib/children";
import { activeLinkUntil, getChildForm } from "@/lib/forms/queries";
import { requireTherapist } from "@/lib/session";

export async function generateMetadata(props: PageProps<"/children/[id]/forms/[formId]">) {
  const { t } = await getI18n();
  const { accountId } = await requireTherapist();
  const form = getChildForm(accountId, (await props.params).formId);
  return { title: `${form?.schema.title ?? t.forms.fillEyebrow} · ${t.app.name}` };
}

export default async function ChildFormPage(props: PageProps<"/children/[id]/forms/[formId]">) {
  const i18n = await getI18n();
  const { t } = i18n;
  const f = t.forms;
  const { accountId, account } = await requireTherapist();
  const { id, formId } = await props.params;
  const child = getChild(accountId, id);
  const form = getChildForm(accountId, formId);
  if (!child || !form || form.childId !== child.id) notFound();

  const submitted = form.status === "submitted";
  const activeUntil = activeLinkUntil(form);
  const letterhead = [account.name, ...(account.letterhead ?? "").split("\n")].map((l) => l.trim()).filter(Boolean);
  const printMeta = [f.printChild(child.name), ...(form.submittedAt && form.submittedBy ? [f.submittedBy[form.submittedBy](i18n.date(form.submittedAt.toISOString()))] : [])];

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <Link href={`/children/${child.id}`} className="-my-2 inline-flex min-h-11 items-center gap-1 text-[13.5px] text-ink-muted hover:text-ink">
        <ChevronLeft className="size-4 rtl:rotate-180" />
        {f.backToChild}
      </Link>

      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <Eyebrow>
            {f.fillEyebrow} · <bdi>{i18n.childName(child)}</bdi>
          </Eyebrow>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <h1 className="font-serif text-[28px] leading-tight font-medium">
              <bdi>{form.schema.title}</bdi>
            </h1>
            <ChildFormStatusBadge status={form.status} />
          </div>
          {form.submittedAt && form.submittedBy && (
            <p className="mt-1 text-[13px] text-ink-muted">{f.submittedBy[form.submittedBy](i18n.date(form.submittedAt.toISOString()))}</p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <PrintForm
            form={form.schema}
            answers={form.answers}
            letterhead={letterhead}
            meta={printMeta}
            fileName={`${form.schema.title} - ${child.name}`}
          />
          {submitted && (
            <form action={reopenChildForm.bind(null, form.id)}>
              <Button type="submit" variant="secondary">
                <RotateCcw className="size-4" />
                {f.reopen}
              </Button>
            </form>
          )}
        </div>
      </header>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Card className="p-5 sm:p-6">
          {form.schema.description && <p className="mb-6 text-[13.5px] whitespace-pre-line text-ink-soft">{form.schema.description}</p>}
          {submitted ? (
            <FormRenderer form={form.schema} answers={form.answers} mode="readonly" hideTitle />
          ) : (
            <ChildFormFill id={form.id} form={form.schema} initial={form.answers} />
          )}
        </Card>

        <div className="space-y-5 lg:sticky lg:top-6">
          <Card>
            <CardHeader title={f.share.title} />
            <div className="px-5 pb-5">
              <SharePanel formId={form.id} activeUntil={activeUntil} submitted={submitted} />
            </div>
          </Card>
          <ConfirmButton label={f.removeFromChild} question={f.removeConfirm} onConfirm={deleteChildForm.bind(null, form.id)} />
        </div>
      </div>
    </div>
  );
}
