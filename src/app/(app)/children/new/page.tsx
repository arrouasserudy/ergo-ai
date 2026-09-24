import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { NewChildForm } from "@/components/children/NewChildForm";
import { Card, CardHeader } from "@/components/ui/Card";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { getI18n } from "@/i18n/server";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: `${t.children.newTitle} · ${t.app.name}` };
}

export default async function NewChildPage() {
  const i18n = await getI18n();
  const { t } = i18n;
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Link href="/children" className="inline-flex items-center gap-1 text-[13px] text-ink-muted hover:text-ink">
        <ChevronLeft className="size-4 rtl:rotate-180" />
        {t.children.backToList}
      </Link>
      <header>
        <Eyebrow>{t.children.newEyebrow}</Eyebrow>
        <h1 className="mt-1 font-serif text-[32px] leading-tight font-medium">{t.children.newTitle}</h1>
        <p className="mt-1 text-[13px] text-ink-muted">{t.children.newSubtitle}</p>
      </header>
      <Card>
        <CardHeader title={t.sections.identity.title} hint={t.sections.identity.hint} />
        <NewChildForm />
      </Card>
    </div>
  );
}
