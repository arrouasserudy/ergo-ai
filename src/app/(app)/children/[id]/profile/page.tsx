import { Archive, RotateCcw } from "lucide-react";
import { notFound } from "next/navigation";
import { setChildStatus } from "@/app/actions/children";
import { EditableSection } from "@/components/children/EditableSection";
import { InfoList } from "@/components/children/InfoList";
import { GroupBadge } from "@/components/groups/GroupBadge";
import { Button } from "@/components/ui/Button";
import { TagList } from "@/components/ui/TagList";
import type { Child } from "@/db/schema";
import { isolate } from "@/i18n";
import { getI18n } from "@/i18n/server";
import { getChild } from "@/lib/children";
import { listGroups } from "@/lib/groups/queries";
import { requireTherapist } from "@/lib/session";

export async function generateMetadata(props: PageProps<"/children/[id]/profile">) {
  const i18n = await getI18n();
  const { t } = i18n;
  const { accountId } = await requireTherapist();
  const child = getChild(accountId, (await props.params).id);
  return { title: `${t.children.tabs.profile} · ${child ? isolate(i18n.childName(child)) : ""} · ${t.app.name}` };
}

const hasHistory = (c: Child) =>
  [c.medicalHistory, c.birthHistory, c.surgicalHistory, c.geneticDiagnoses, c.familyHistory, c.familyComposition, c.siblingsCount, c.otherInfo].some(
    (v) => v !== null,
  );

const hasSensory = (c: Child) =>
  Boolean(c.knownTriggers || c.warningSigns || c.seeksDeepPressure) ||
  [c.hyperSensitivities, c.hypoReactivities, c.backgroundFactors, c.calmingStrategies, c.interests].some((l) => l.length > 0);

const tags = (values: string[]) => (values.length ? <TagList values={values} /> : null);

/** Profile tab: identity, history and sensory profile, each editable in place; archiving the file. */
export default async function ChildProfilePage(props: PageProps<"/children/[id]/profile">) {
  const i18n = await getI18n();
  const { t } = i18n;
  const f = t.fields;
  const { accountId } = await requireTherapist();
  const { id } = await props.params;
  const child = getChild(accountId, id);
  if (!child) notFound();

  const groups = listGroups(accountId);
  const group = groups.find((g) => g.id === child.groupId);
  const age = i18n.age(child.birthDate);
  const archived = child.status === "archived";
  const toggleStatus = setChildStatus.bind(null, child.id, archived ? "active" : "archived");

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2">
        <div className="min-w-0 space-y-5">
          <EditableSection
            child={child}
            section="identity"
            title={t.sections.identity.title}
            hint={t.sections.identity.hint}
            groups={groups.map(({ id, name }) => ({ id, name }))}
          >
            <InfoList
              items={[
                { label: f.name, value: <bdi>{i18n.childName(child)}</bdi> },
                { label: f.birthDate, value: child.birthDate && `${i18n.date(child.birthDate)}${age ? ` (${age})` : ""}` },
                { label: f.referralReason, value: child.referralReason, wide: true },
                { label: f.schoolLevel, value: child.schoolLevel },
                { label: f.followUpStart, value: i18n.date(child.followUpStart) },
                ...(groups.length ? [{ label: f.group, value: group ? <GroupBadge group={group} href={`/groups/${group.id}`} /> : null }] : []),
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

        <div className="min-w-0">
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
        </div>
      </div>

      <form action={toggleStatus}>
        <Button type="submit" variant="secondary">
          {archived ? <RotateCcw className="size-4" /> : <Archive className="size-4" />}
          {archived ? t.children.reactivate : t.children.archive}
        </Button>
      </form>
    </div>
  );
}
