import Link from "next/link";
import { notFound } from "next/navigation";
import { CrisisTrend } from "@/components/progress/CrisisTrend";
import { ProgressPicker } from "@/components/progress/ProgressPicker";
import { ScoreComparison } from "@/components/progress/ScoreComparison";
import { Card } from "@/components/ui/Card";
import { isolate } from "@/i18n";
import { getI18n } from "@/i18n/server";
import { getDefinition, scoresOf } from "@/lib/assessments/registry";
import { getChild } from "@/lib/children";
import { compareScores, countAllChanges, countChanges, linearMax, monthsBetween } from "@/lib/progress/compare";
import { completedAdministrations, episodesSince } from "@/lib/progress/queries";
import { addMonths, averages, localMonth, monthlyCounts } from "@/lib/progress/trend";
import { requireTherapist } from "@/lib/session";
import { APP_TIME_ZONE } from "@/lib/time";

export async function generateMetadata(props: PageProps<"/children/[id]/progress">) {
  const i18n = await getI18n();
  const { t } = i18n;
  const { accountId } = await requireTherapist();
  const child = getChild(accountId, (await props.params).id);
  return { title: `${t.progress.title} · ${child ? isolate(i18n.childName(child)) : ""} · ${t.app.name}` };
}

const one = (value: string | string[] | undefined) => (typeof value === "string" ? value : undefined);

/**
 * Progress tab: two completed administrations of the same test compared on the stored
 * scores, and the crises and difficulties per month over the same period. No AI.
 */
export default async function ChildProgressPage(props: PageProps<"/children/[id]/progress">) {
  const i18n = await getI18n();
  const p = i18n.t.progress;
  const { accountId, account } = await requireTherapist();
  const { id } = await props.params;
  const query = await props.searchParams;
  const child = getChild(accountId, id);
  if (!child) notFound();

  const runs = completedAdministrations(accountId, child.id).filter((run) => getDefinition(run.definitionId));
  if (runs.length === 0) {
    return (
      <Card className="max-w-3xl space-y-3 px-5 py-6">
        <p className="text-[14px] text-ink-soft">{p.noTests}</p>
        <Link href={`/children/${child.id}/forms`} className="inline-flex min-h-9 items-center text-[13.5px] font-medium text-primary hover:underline">
          {p.openTests}
        </Link>
      </Card>
    );
  }

  // Tests that can be compared first, then the most recently given.
  const byTest = Map.groupBy(runs, (run) => run.definitionId);
  const testIds = [...byTest.keys()].sort((a, b) => {
    const [ra, rb] = [byTest.get(a)!, byTest.get(b)!];
    return Number(rb.length > 1) - Number(ra.length > 1) || rb.at(-1)!.testDate.localeCompare(ra.at(-1)!.testDate);
  });
  const testId = testIds.find((t) => t === one(query.test)) ?? testIds[0];
  const definition = getDefinition(testId)!;
  const administrations = byTest.get(testId)!;

  let after = administrations.find((r) => r.id === one(query.after)) ?? administrations.at(-1)!;
  let before =
    administrations.find((r) => r.id === one(query.before) && r.id !== after.id) ??
    administrations[administrations.indexOf(after) - 1] ??
    administrations.find((r) => r.id !== after.id) ??
    null;
  if (before && before.testDate > after.testDate) [before, after] = [after, before];

  const groups = compareScores(before ? scoresOf(definition, before, child.birthDate) : [], scoresOf(definition, after, child.birthDate));
  const summary = groups.find((g) => g.id === definition.summaryGroup) ?? groups[0];
  // The test's summary group first.
  const ordered = [summary, ...groups.filter((g) => g !== summary)];
  const count = countChanges(summary);
  const overall = countAllChanges(groups);
  const unbanded = groups.filter((g) => !g.bands?.length);
  const step = unbanded.some((g) => g.rows.some((r) => r.unit === "months")) ? 12 : 10;
  const linear = unbanded.length ? { max: linearMax(unbanded, step), step } : undefined;
  const beforeDate = before ? i18n.date(before.testDate) : null;
  const afterDate = i18n.date(after.testDate);

  // Crises from 2 months before the first compared test to this month.
  const first = before ?? after;
  const from = addMonths(first.testDate.slice(0, 7), -2);
  const now = new Date();
  const since = new Date(Date.UTC(Number(from.slice(0, 4)), Number(from.slice(5, 7)) - 1, 1) - 2 * 86_400_000);
  const counts = monthlyCounts(account.crisesEnabled ? episodesSince(accountId, child.id, since) : [], { from, to: localMonth(now, APP_TIME_ZONE), timeZone: APP_TIME_ZONE });
  const hasEpisodes = counts.some((c) => c.crisis + c.difficulty > 0);
  const mean = averages(counts, first.testDate.slice(0, 7));

  const scoreProps = { beforeDate, afterDate, language: definition.language, linear };

  return (
    <div className="space-y-5">
      <Card className="px-5 py-5 sm:px-6">
        <ProgressPicker
          key={`${testId}-${before?.id}-${after.id}`}
          action={`/children/${child.id}/progress`}
          tests={testIds.map((t) => ({ value: t, label: getDefinition(t)!.shortName }))}
          administrations={administrations.map((r) => ({ value: r.id, label: i18n.date(r.testDate) }))}
          test={testId}
          before={before?.id ?? null}
          after={after.id}
        />
        <div className="mt-5 flex flex-wrap items-end justify-between gap-x-6 gap-y-3 border-t border-line pt-4">
          {before && count.total > 0 ? (
            <div className="min-w-0">
              <p className="text-[20px] leading-tight font-semibold tracking-tight">
                {count.kind === "bands" ? p.bandChanges(count.changed, count.total) : p.valueChanges(count.changed, count.total)}
              </p>
              <p className="mt-1 text-[13px] text-ink-muted">
                <bdi>{summary.title}</bdi>
                {" · "}
                {p.gap(monthsBetween(before.testDate, after.testDate))}
                {overall && groups.length > 1 && ` · ${p.allBandChanges(overall.changed, overall.total)}`}
              </p>
            </div>
          ) : (
            <p className="max-w-2xl text-[14px] text-ink-soft">{before ? p.gap(monthsBetween(before.testDate, after.testDate)) : p.single(afterDate)}</p>
          )}
          <div className="flex flex-wrap gap-x-5 gap-y-1 text-[12.5px] text-ink-soft">
            {before && (
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2.5 rounded-full border-2 border-ink-muted bg-surface" />
                {p.before} · {beforeDate}
              </span>
            )}
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-primary" />
              {before ? `${p.after} · ${afterDate}` : afterDate}
            </span>
          </div>
        </div>
        {before && before.definitionVersion !== after.definitionVersion && <p className="mt-3 text-[12.5px] text-warn-ink">{p.versionNote}</p>}
      </Card>

      {ordered.map((group) => (
        <Card key={group.id} className="px-5 py-5 sm:px-6">
          <h2 className="mb-3 text-[15px] font-semibold">
            <bdi>{group.title}</bdi>
          </h2>
          <ScoreComparison group={group} {...scoreProps} />
        </Card>
      ))}

      {account.crisesEnabled && (
        <Card className="px-5 py-5 sm:px-6">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
            <h2 className="text-[15px] font-semibold">{p.crisisTitle}</h2>
            {hasEpisodes && (
              <div className="flex gap-4 text-[12.5px] text-ink-soft">
                <span className="inline-flex items-center gap-1.5">
                  <span className="size-2.5 rounded-sm bg-warn-ink" />
                  {p.crisis}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="size-2.5 rounded-sm bg-warn-ink/35" />
                  {p.difficulty}
                </span>
              </div>
            )}
          </div>
          {hasEpisodes ? (
            <>
              <CrisisTrend counts={counts} marks={administrations.map((r) => ({ date: r.testDate, label: `${definition.shortName} · ${i18n.date(r.testDate)}` }))} />
              {mean && <p className="mt-2 text-[13px] text-ink-soft">{p.averages(i18n.number(mean.around), i18n.date(first.testDate), i18n.number(mean.recent))}</p>}
            </>
          ) : (
            <p className="text-[13.5px] text-ink-muted">{p.noEpisodes}</p>
          )}
        </Card>
      )}

      <p className="text-[12px] text-ink-muted">{p.source}</p>
    </div>
  );
}
