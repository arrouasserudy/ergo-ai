import { Gauge } from "lucide-react";
import Link from "next/link";
import { AssessmentStatusBadge } from "@/components/assessments/AssessmentStatusBadge";
import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader } from "@/components/ui/Card";
import { getI18n } from "@/i18n/server";
import { recentAssessments } from "@/lib/assessments/queries";
import { ASSESSMENTS, getDefinition } from "@/lib/assessments/registry";
import { requireTherapist } from "@/lib/session";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: `${t.assessments.listTitle} · ${t.app.name}` };
}

export default async function AssessmentsPage() {
  const i18n = await getI18n();
  const a = i18n.t.assessments;
  const { accountId } = await requireTherapist();
  const recent = recentAssessments(accountId);

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <header>
        <h1 className="font-serif text-[32px] leading-tight font-medium">{a.listTitle}</h1>
        <p className="mt-1 max-w-2xl text-[13px] text-ink-muted">{a.listSubtitle}</p>
      </header>

      <Card>
        <CardHeader title={a.catalogTitle} />
        <ul className="divide-y divide-line border-t border-line">
          {ASSESSMENTS.map((d) => (
            <li key={d.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-5 py-3.5">
              <Gauge className="size-4 shrink-0 text-ink-muted" />
              <span className="min-w-0 flex-1">
                <bdi className="block text-[14px] font-medium">{d.name}</bdi>
                <span className="block text-[12px] text-ink-muted">
                  {a.items(d.sections.reduce((n, s) => n + s.items.length, 0))}
                  {d.ageRange && ` · ${a.ageRange(a.age(d.ageRange.minMonths), a.age(d.ageRange.maxMonths))}`}
                </span>
              </span>
              {d.respondents.map((r) => (
                <Badge key={r} tone={r === "parent" ? "tint" : "muted"}>
                  {a.respondents[r]}
                </Badge>
              ))}
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <CardHeader title={a.recentTitle} />
        {recent.length === 0 ? (
          <p className="px-5 pb-5 text-[13px] text-ink-muted">{a.recentNone}</p>
        ) : (
          <ul className="divide-y divide-line border-t border-line">
            {recent.map(({ assessment, child }) => (
              <li key={assessment.id}>
                <Link
                  href={`/children/${child.id}/assessments/${assessment.id}`}
                  className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-surface-muted"
                >
                  <span className="min-w-0 flex-1">
                    <bdi className="block truncate text-[14px] font-medium">{i18n.childName(child)}</bdi>
                    <span className="block text-[12px] text-ink-muted">
                      <bdi>{getDefinition(assessment.definitionId)?.shortName ?? assessment.definitionId}</bdi> · {i18n.date(assessment.testDate)}
                    </span>
                  </span>
                  <AssessmentStatusBadge status={assessment.status} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
