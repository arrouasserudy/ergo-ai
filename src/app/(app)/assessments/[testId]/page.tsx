import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AssessmentForm } from "@/components/assessments/AssessmentForm";
import { StartForChild } from "@/components/assessments/StartForChild";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { getI18n } from "@/i18n/server";
import { getDefinition } from "@/lib/assessments/registry";
import { EMPTY_ANSWERS } from "@/lib/assessments/types";
import { listChildren } from "@/lib/children";
import { requireTherapist } from "@/lib/session";

export async function generateMetadata(props: PageProps<"/assessments/[testId]">) {
  const { t } = await getI18n();
  await requireTherapist();
  const definition = getDefinition((await props.params).testId);
  return { title: `${definition?.shortName ?? t.assessments.listTitle} · ${t.app.name}` };
}

/** A test of the catalog, blank and read-only: nothing is answered, scored or saved here. */
export default async function AssessmentPreviewPage(props: PageProps<"/assessments/[testId]">) {
  const i18n = await getI18n();
  const a = i18n.t.assessments;
  const { accountId } = await requireTherapist();
  const definition = getDefinition((await props.params).testId);
  if (!definition) notFound();

  const childOptions = listChildren(accountId).map((c) => ({ id: c.id, name: i18n.childName(c) }));
  const wanted = (await props.searchParams).child;
  const initialChildId = typeof wanted === "string" && childOptions.some((c) => c.id === wanted) ? wanted : "";
  const itemCount = definition.sections.reduce((n, s) => n + s.items.length, 0);

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <Link href="/assessments" className="-my-2 inline-flex min-h-11 items-center gap-1 text-[13.5px] text-ink-muted hover:text-ink">
        <ChevronLeft className="size-4 rtl:rotate-180" />
        {a.backToCatalog}
      </Link>

      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <Eyebrow>{a.eyebrow}</Eyebrow>
          <h1 className="mt-1 text-[24px] leading-tight font-semibold tracking-tight">
            <bdi>{definition.name}</bdi>
          </h1>
          <p className="mt-1 text-[13px] text-ink-muted">
            {a.items(itemCount)}
            {definition.ageRange && ` · ${a.ageRange(a.age(definition.ageRange.minMonths), a.age(definition.ageRange.maxMonths))}`}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {definition.respondents.map((r) => (
              <Badge key={r} tone={r === "parent" ? "tint" : "muted"}>
                {a.respondents[r]}
              </Badge>
            ))}
          </div>
          <p className="mt-2 text-[12.5px] text-ink-muted">{a.catalogPreviewHint}</p>
        </div>
        {childOptions.length > 0 && <StartForChild definitionId={definition.id} childOptions={childOptions} initialChildId={initialChildId} />}
      </header>

      <Card className="p-5 sm:p-6">
        {definition.instructions && (
          <details className="mb-6 rounded-lg bg-surface-muted p-3 text-[13px]" dir={definition.language === "he" ? "rtl" : "ltr"} lang={definition.language}>
            <summary className="cursor-pointer font-medium">{a.instructions}</summary>
            <p className="mt-2 whitespace-pre-line text-ink-soft">{definition.instructions}</p>
          </details>
        )}
        <AssessmentForm definitionId={definition.id} answers={EMPTY_ANSWERS} mode="preview" idPrefix="preview" />
      </Card>
    </div>
  );
}
