import { RotateCcw } from "lucide-react";
import { notFound } from "next/navigation";
import { createAssessmentLink, deleteAssessment, reopenAssessment, revokeAssessmentLink } from "@/app/actions/assessments";
import { AssessmentFill } from "@/components/assessments/AssessmentFill";
import { AssessmentForm } from "@/components/assessments/AssessmentForm";
import { AssessmentStatusBadge } from "@/components/assessments/AssessmentStatusBadge";
import { PrintAssessment } from "@/components/assessments/PrintAssessment";
import { ScoreSummary } from "@/components/assessments/ScoreSummary";
import { ConfirmButton } from "@/components/forms/ConfirmButton";
import { SharePanel } from "@/components/forms/SharePanel";
import { BackLink } from "@/components/ui/BackLink";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { getI18n } from "@/i18n/server";
import { getAssessment, previousAssessment } from "@/lib/assessments/queries";
import { ageAtTest, getDefinition, inAgeRange, scoresOf } from "@/lib/assessments/registry";
import { getChild } from "@/lib/children";
import { activeLinkUntil } from "@/lib/forms/queries";
import { requireTherapist } from "@/lib/session";

export async function generateMetadata(props: PageProps<"/children/[id]/assessments/[assessmentId]">) {
  const { t } = await getI18n();
  const { accountId } = await requireTherapist();
  const assessment = getAssessment(accountId, (await props.params).assessmentId);
  const definition = assessment && getDefinition(assessment.definitionId);
  return { title: `${definition?.shortName ?? t.assessments.eyebrow} · ${t.app.name}` };
}

export default async function AssessmentPage(props: PageProps<"/children/[id]/assessments/[assessmentId]">) {
  const i18n = await getI18n();
  const a = i18n.t.assessments;
  const { accountId, account } = await requireTherapist();
  const { id, assessmentId } = await props.params;
  const child = getChild(accountId, id);
  const assessment = getAssessment(accountId, assessmentId);
  const definition = assessment && getDefinition(assessment.definitionId);
  if (!child || !assessment || !definition || assessment.childId !== child.id) notFound();

  const completed = assessment.status === "completed";
  const ageMonths = ageAtTest(child.birthDate, assessment.testDate);
  const range = definition.ageRange && a.ageRange(a.age(definition.ageRange.minMonths), a.age(definition.ageRange.maxMonths));
  const before = previousAssessment(accountId, assessment);
  const previous = before && { date: i18n.date(before.testDate), groups: scoresOf(definition, before, child.birthDate) };
  const scores = scoresOf(definition, assessment, child.birthDate);
  const letterhead = [account.name, ...(account.letterhead ?? "").split("\n")].map((l) => l.trim()).filter(Boolean);
  const printMeta = [a.printChild(child.name), a.printDate(i18n.date(assessment.testDate)), ...(ageMonths !== null ? [a.ageAtTest(a.age(ageMonths))] : [])];

  return (
    <div className="space-y-5">
      <BackLink href={`/children/${child.id}/forms`}>{i18n.t.children.tabs.forms}</BackLink>

      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <Eyebrow>{a.eyebrow}</Eyebrow>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <h2 className="text-[24px] leading-tight font-semibold tracking-tight">
              <bdi>{definition.name}</bdi>
            </h2>
            <AssessmentStatusBadge status={assessment.status} />
          </div>
          <p className="mt-1 text-[13px] text-ink-muted">
            {a.printDate(i18n.date(assessment.testDate))}
            {" · "}
            {ageMonths === null ? a.noBirthDate : a.ageAtTest(a.age(ageMonths))}
          </p>
          {assessment.completedAt && assessment.completedBy && (
            <p className="text-[13px] text-ink-muted">{a.completedBy[assessment.completedBy](i18n.date(assessment.completedAt.toISOString()))}</p>
          )}
          {range && !inAgeRange(definition, ageMonths) && <p className="mt-2 max-w-2xl text-[13px] font-medium text-warn-ink">{a.outOfRange(range)}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          {completed && (
            <PrintAssessment
              definitionId={definition.id}
              answers={assessment.answers}
              scores={scores}
              previous={previous}
              letterhead={letterhead}
              meta={printMeta}
              fileName={`${definition.shortName} - ${child.name}`}
            />
          )}
          {completed && (
            <form action={reopenAssessment.bind(null, assessment.id)}>
              <Button type="submit" variant="secondary">
                <RotateCcw className="size-4" />
                {a.reopen}
              </Button>
            </form>
          )}
        </div>
      </header>

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-5">
          {completed && (
            <Card className="p-5 sm:p-6">
              <h2 className="mb-4 text-[17px] font-semibold tracking-tight">{a.resultsTitle}</h2>
              <ScoreSummary groups={scores} language={definition.language} previous={previous} />
            </Card>
          )}
          <Card className="p-5 sm:p-6">
            {completed && <h2 className="mb-4 text-[17px] font-semibold tracking-tight">{a.answersTitle}</h2>}
            {definition.instructions && !completed && (
              <details className="mb-6 rounded-lg bg-surface-muted p-3 text-[13px]" dir={definition.language === "he" ? "rtl" : "ltr"}>
                <summary className="cursor-pointer font-medium">{a.instructions}</summary>
                <p className="mt-2 whitespace-pre-line text-ink-soft">{definition.instructions}</p>
              </details>
            )}
            {completed ? (
              <AssessmentForm definitionId={definition.id} answers={assessment.answers} mode="readonly" idPrefix="read" />
            ) : (
              <AssessmentFill id={assessment.id} definitionId={definition.id} initial={assessment.answers} ageMonths={ageMonths} />
            )}
          </Card>
        </div>

        <div className="space-y-5 lg:sticky lg:top-6">
          {definition.respondents.includes("parent") && (
            <Card>
              <CardHeader title={a.share.title} />
              <div className="px-5 pb-5">
                <SharePanel
                  create={createAssessmentLink.bind(null, assessment.id)}
                  revoke={revokeAssessmentLink.bind(null, assessment.id)}
                  path="/t/"
                  hint={a.share.hint}
                  activeUntil={activeLinkUntil(assessment)}
                  submitted={completed}
                />
              </div>
            </Card>
          )}
          <ConfirmButton label={a.delete} question={a.deleteConfirm} onConfirm={deleteAssessment.bind(null, assessment.id)} />
        </div>
      </div>
    </div>
  );
}
