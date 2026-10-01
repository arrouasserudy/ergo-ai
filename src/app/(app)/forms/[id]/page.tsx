import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FormAutomation } from "@/components/forms/FormAutomation";
import { FormBuilder } from "@/components/forms/FormBuilder";
import { TemplateStatusBadge } from "@/components/forms/TemplateStatusBadge";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { getI18n } from "@/i18n/server";
import { getTemplate } from "@/lib/forms/queries";
import { requireTherapist } from "@/lib/session";

export async function generateMetadata(props: PageProps<"/forms/[id]">) {
  const { t } = await getI18n();
  const { accountId } = await requireTherapist();
  const template = getTemplate(accountId, (await props.params).id);
  return { title: `${template?.title ?? t.forms.listTitle} · ${t.app.name}` };
}

export default async function FormTemplatePage(props: PageProps<"/forms/[id]">) {
  const { t } = await getI18n();
  const f = t.forms;
  const { accountId } = await requireTherapist();
  const template = getTemplate(accountId, (await props.params).id);
  if (!template) notFound();

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <Link href="/forms" className="-my-2 inline-flex min-h-11 items-center gap-1 text-[13.5px] text-ink-muted hover:text-ink">
        <ChevronLeft className="size-4 rtl:rotate-180" />
        {f.backToList}
      </Link>
      <header>
        <Eyebrow>{f.editorEyebrow}</Eyebrow>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <h1 className="text-[24px] leading-tight font-semibold tracking-tight">
            <bdi>{template.title}</bdi>
          </h1>
          <TemplateStatusBadge status={template.status} />
        </div>
        <p className="mt-1 text-[12.5px] text-ink-muted">
          <bdi>{f.convertedFrom(template.sourceFilename)}</bdi>
        </p>
        <p className="mt-2 max-w-3xl text-[13px] text-ink-soft">{f.editorHint}</p>
      </header>
      <FormAutomation id={template.id} autoAssign={template.autoAssign} deadline={template.deadline} published={template.status === "published"} />
      <FormBuilder id={template.id} initial={template.schema} status={template.status} />
    </div>
  );
}
