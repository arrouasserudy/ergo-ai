import { Gauge, Plus } from "lucide-react";
import Link from "next/link";
import { startAssessment } from "@/app/actions/assessments";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { getI18n } from "@/i18n/server";
import { progress } from "@/lib/assessments/answers";
import { listChildAssessments } from "@/lib/assessments/queries";
import { ASSESSMENTS, getDefinition } from "@/lib/assessments/registry";
import { localToday } from "@/lib/time";
import { AssessmentStatusBadge } from "./AssessmentStatusBadge";

const control =
  "h-9 min-w-0 rounded-lg border border-line-strong bg-surface px-2 text-[13px] focus:border-primary focus:ring-2 focus:ring-primary/15 focus:outline-none";

/** "OT tests" card of the child page: the child's tests and the picker to start one. */
export async function AssessmentsCard({ accountId, childId, archived }: { accountId: string; childId: string; archived: boolean }) {
  const i18n = await getI18n();
  const a = i18n.t.assessments;
  const rows = listChildAssessments(accountId, childId);

  return (
    <Card>
      <CardHeader title={a.childCardTitle} hint={a.childCardHint} />
      {rows.length === 0 ? (
        <p className="px-5 pb-4 text-[13px] text-ink-muted">{a.childNone}</p>
      ) : (
        <ul className="divide-y divide-line border-y border-line">
          {rows.map((row) => {
            const definition = getDefinition(row.definitionId);
            const done = definition && progress(definition, row.answers);
            return (
              <li key={row.id}>
                <Link href={`/children/${childId}/assessments/${row.id}`} className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-surface-muted">
                  <Gauge className="size-4 shrink-0 text-ink-muted" />
                  <span className="min-w-0 flex-1">
                    <bdi className="block truncate text-[14px] font-medium">{definition?.shortName ?? row.definitionId}</bdi>
                    <span className="block text-[12px] text-ink-muted">
                      {i18n.date(row.testDate)}
                      {row.status !== "completed" && done && ` · ${a.progress(done.answered, done.total)}`}
                    </span>
                  </span>
                  <AssessmentStatusBadge status={row.status} />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      {!archived && (
        <form action={startAssessment.bind(null, childId)} className="flex flex-wrap gap-2 px-5 py-4">
          <select name="definitionId" required defaultValue="" aria-label={a.pickTest} className={`${control} flex-1`}>
            <option value="" disabled>
              {a.pickPlaceholder}
            </option>
            {ASSESSMENTS.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
          <input type="date" name="testDate" required defaultValue={localToday()} aria-label={a.testDate} className={control} />
          <Button type="submit" size="sm">
            <Plus className="size-3.5" />
            {a.start}
          </Button>
        </form>
      )}
    </Card>
  );
}
