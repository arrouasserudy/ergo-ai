import { Archive, ChevronLeft, MessageCircle, Plus, RotateCcw } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { setChildStatus } from "@/app/actions/children";
import { EditableSection } from "@/components/children/EditableSection";
import { EpisodeList } from "@/components/episodes/EpisodeList";
import { AssessmentsCard } from "@/components/assessments/AssessmentsCard";
import { ChildFormsCard } from "@/components/forms/ChildFormsCard";
import { DeadlineBadge } from "@/components/forms/DeadlineBadge";
import { OpenEpisodes } from "@/components/episodes/OpenEpisodes";
import { ReportRows } from "@/components/reports/ReportRows";
import { StartButtons } from "@/components/episodes/StartButtons";
import { InfoList } from "@/components/children/InfoList";
import { StatusBadge } from "@/components/children/StatusBadge";
import { Button, LinkButton } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { TagList } from "@/components/ui/TagList";
import type { Child } from "@/db/schema";
import { isolate } from "@/i18n";
import { getI18n } from "@/i18n/server";
import { getChild } from "@/lib/children";
import { listChildEpisodes } from "@/lib/episodes";
import { listReports } from "@/lib/reports/queries";
import { pendingForms, urgencyByChild } from "@/lib/forms/queries";
import { requireTherapist } from "@/lib/session";
import { localToday } from "@/lib/time";

export async function generateMetadata(props: PageProps<"/children/[id]">) {
  const i18n = await getI18n();
  const { t } = i18n;
  const { accountId } = await requireTherapist();
  const child = getChild(accountId, (await props.params).id);
  return { title: `${child ? isolate(i18n.childName(child)) : t.children.listTitle} · ${t.app.name}` };
}

const hasHistory = (c: Child) =>
  [c.medicalHistory, c.birthHistory, c.surgicalHistory, c.geneticDiagnoses, c.familyHistory, c.familyComposition, c.siblingsCount, c.otherInfo].some(
    (v) => v !== null,
  );

const hasSensory = (c: Child) =>
  Boolean(c.knownTriggers || c.warningSigns || c.seeksDeepPressure) ||
  [c.hyperSensitivities, c.hypoReactivities, c.backgroundFactors, c.calmingStrategies, c.interests].some((l) => l.length > 0);

const tags = (values: string[]) => (values.length ? <TagList values={values} /> : null);

export default async function ChildPage(props: PageProps<"/children/[id]">) {
  const i18n = await getI18n();
  const { t } = i18n;
  const f = t.fields;
  const { accountId, account } = await requireTherapist();
  const { id } = await props.params;
  const child = getChild(accountId, id);
  if (!child) notFound();

  const episodes = listChildEpisodes(accountId, child.id, { limit: 20 });
  const openEpisodes = episodes.filter((ep) => ep.status === "open");
  const recentEpisodes = episodes.filter((ep) => ep.status === "closed").slice(0, 3);
  const reports = listReports(accountId, { childId: child.id });

  const age = i18n.age(child.birthDate);
  const archived = child.status === "archived";
  const toggleStatus = setChildStatus.bind(null, child.id, archived ? "active" : "archived");

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <Link href="/children" className="-my-2 inline-flex min-h-11 items-center gap-1 text-[13.5px] text-ink-muted hover:text-ink">
        <ChevronLeft className="size-4 rtl:rotate-180" />
        {t.children.backToList}
      </Link>

      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <Eyebrow>{t.children.detailEyebrow}</Eyebrow>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <h1 className="font-serif text-[32px] leading-tight font-medium">
              <bdi>{i18n.childName(child)}</bdi>
              {age && <span> · {age}</span>}
            </h1>
            <StatusBadge status={child.status} />
            <DeadlineBadge urgency={urgencyByChild(pendingForms(accountId, localToday(), account.deadlineWarnDays)).get(child.id)} />
          </div>
          <p className="mt-1 text-[13px] text-ink-muted">
            {[child.followUpStart && t.children.since(i18n.date(child.followUpStart)), t.children.reasonMeta(child.referralReason)]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <LinkButton href={`/expert?child=${child.id}`} variant="secondary">
            <MessageCircle className="size-4" />
            {t.expert.askExpert}
          </LinkButton>
          <form action={toggleStatus}>
          <Button type="submit" variant="secondary">
            {archived ? <RotateCcw className="size-4" /> : <Archive className="size-4" />}
            {archived ? t.children.reactivate : t.children.archive}
          </Button>
          </form>
        </div>
      </header>

      {archived && (
        <p className="rounded-lg border border-muted-badge-ink/20 bg-muted-badge px-4 py-2.5 text-[13px] text-muted-badge-ink">
          {t.children.archivedBanner}
        </p>
      )}

      <div className="grid items-start gap-5 lg:grid-cols-2">
        <div className="space-y-5">
          <EditableSection child={child} section="identity" title={t.sections.identity.title} hint={t.sections.identity.hint}>
            <InfoList
              items={[
                { label: f.name, value: <bdi>{i18n.childName(child)}</bdi> },
                { label: f.birthDate, value: child.birthDate && `${i18n.date(child.birthDate)}${age ? ` (${age})` : ""}` },
                { label: f.referralReason, value: child.referralReason, wide: true },
                { label: f.schoolLevel, value: child.schoolLevel },
                { label: f.followUpStart, value: i18n.date(child.followUpStart) },
              ]}
            />
          </EditableSection>

          <EditableSection
            child={child}
            section="history"
            title={t.sections.history.title}
            hint={t.sections.history.hint}
            empty={hasHistory(child) ? undefined : { title: t.sections.history.empty, body: t.sections.history.emptyBody }}
          >
            <InfoList
              items={[
                { label: f.medicalHistory, value: child.medicalHistory, wide: true },
                { label: f.birthHistory, value: child.birthHistory },
                { label: f.surgicalHistory, value: child.surgicalHistory },
                { label: f.geneticDiagnoses, value: child.geneticDiagnoses, wide: true },
                { label: f.familyHistory, value: child.familyHistory, wide: true },
                { label: f.familyComposition, value: child.familyComposition },
                { label: f.siblingsCount, value: child.siblingsCount?.toString() },
                { label: f.otherInfo, value: child.otherInfo, wide: true },
              ]}
            />
          </EditableSection>
        </div>

        <div className="space-y-5">
          <EditableSection
            child={child}
            section="sensory"
            title={t.sections.sensory.title}
            hint={t.sections.sensory.hint}
            empty={hasSensory(child) ? undefined : { title: t.sections.sensory.empty, body: t.sections.sensory.emptyBody }}
          >
            <InfoList
              columns={1}
              items={[
                { label: f.knownTriggers, value: child.knownTriggers },
                { label: f.hyperSensitivities, value: tags(child.hyperSensitivities) },
                { label: f.hypoReactivities, value: tags(child.hypoReactivities) },
                { label: f.seeksDeepPressure, value: child.seeksDeepPressure ? t.common.yes : t.common.no },
                { label: f.backgroundFactors, value: tags(child.backgroundFactors) },
                { label: f.warningSigns, value: child.warningSigns },
                { label: f.calmingStrategies, value: tags(child.calmingStrategies) },
                { label: f.interests, value: tags(child.interests) },
              ]}
            />
          </EditableSection>

          <Card>
            <CardHeader title={t.episodes.childCardTitle} hint={t.episodes.childCardHint} />
            <div className="space-y-4 px-5 pb-5">
              <OpenEpisodes items={openEpisodes.map((episode) => ({ episode, child }))} />
              {!archived && <StartButtons childId={child.id} />}
              {recentEpisodes.length === 0 ? (
                <p className="text-[13px] text-ink-muted">{t.episodes.none}</p>
              ) : (
                <div>
                  <p className="mb-1 text-[11.5px] font-medium text-ink-muted">{t.episodes.recent}</p>
                  <div className="-mx-5 border-y border-line">
                    <EpisodeList items={recentEpisodes.map((episode) => ({ episode, child }))} />
                  </div>
                </div>
              )}
              <Link href={`/children/${child.id}/episodes`} className="inline-block text-[12.5px] font-medium text-primary hover:underline">
                {t.episodes.seeHistory}
              </Link>
            </div>
          </Card>

          <Card>
            <CardHeader
              title={t.reports.childCardTitle}
              hint={t.reports.childCardHint}
              action={
                !archived && (
                  <LinkButton href={`/reports/new?child=${child.id}`} size="sm">
                    <Plus className="size-3.5" />
                    {t.reports.newButton}
                  </LinkButton>
                )
              }
            />
            {reports.length === 0 ? (
              <p className="px-5 pb-5 text-[13px] text-ink-muted">{t.reports.childNone}</p>
            ) : (
              <>
                <div className="border-t border-line">
                  <ReportRows rows={reports.slice(0, 3)} showChild={false} />
                </div>
                <Link
                  href={`/reports?child=${child.id}`}
                  className="block border-t border-line px-5 py-3 text-[12.5px] font-medium text-primary hover:underline"
                >
                  {t.reports.seeAll}
                </Link>
              </>
            )}
          </Card>

          <ChildFormsCard accountId={accountId} childId={child.id} archived={archived} warnDays={account.deadlineWarnDays} />

          <AssessmentsCard accountId={accountId} childId={child.id} archived={archived} />
        </div>
      </div>
    </div>
  );
}
