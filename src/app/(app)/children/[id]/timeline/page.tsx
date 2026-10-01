import { notFound } from "next/navigation";
import { TimelineView } from "@/components/timeline/TimelineView";
import { Card } from "@/components/ui/Card";
import { isolate } from "@/i18n";
import { getI18n } from "@/i18n/server";
import { getChild } from "@/lib/children";
import { requireTherapist } from "@/lib/session";
import { childTimeline } from "@/lib/timeline/queries";

export async function generateMetadata(props: PageProps<"/children/[id]/timeline">) {
  const i18n = await getI18n();
  const { t } = i18n;
  const { accountId } = await requireTherapist();
  const child = getChild(accountId, (await props.params).id);
  return { title: `${t.timeline.title} · ${child ? isolate(i18n.childName(child)) : ""} · ${t.app.name}` };
}

/** Timeline tab: everything dated in the file, from birth to today. */
export default async function ChildTimelinePage(props: PageProps<"/children/[id]/timeline">) {
  const { t } = await getI18n();
  const { accountId } = await requireTherapist();
  const { id } = await props.params;
  const child = getChild(accountId, id);
  if (!child) notFound();

  const events = childTimeline(accountId, child);

  return (
    <div className="max-w-4xl space-y-3">
      <p className="text-[13px] text-ink-muted">{t.timeline.subtitle}</p>
      <Card className="px-4 py-5 sm:px-6">
        <TimelineView events={events} birthDate={child.birthDate} />
      </Card>
    </div>
  );
}
