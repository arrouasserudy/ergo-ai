import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TimelineView } from "@/components/timeline/TimelineView";
import { Card } from "@/components/ui/Card";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { isolate } from "@/i18n";
import { getI18n } from "@/i18n/server";
import { childTitle } from "@/lib/child-title";
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

export default async function ChildTimelinePage(props: PageProps<"/children/[id]/timeline">) {
  const i18n = await getI18n();
  const { t } = i18n;
  const { accountId } = await requireTherapist();
  const { id } = await props.params;
  const child = getChild(accountId, id);
  if (!child) notFound();

  const events = childTimeline(accountId, child);

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link href={`/children/${child.id}`} className="-my-2 inline-flex min-h-11 items-center gap-1 text-[13.5px] text-ink-muted hover:text-ink">
        <ChevronLeft className="size-4 rtl:rotate-180" />
        {t.episodes.backToChild(isolate(i18n.childName(child)))}
      </Link>
      <header>
        <Eyebrow>{t.timeline.title}</Eyebrow>
        <h1 className="mt-1 text-[28px] leading-tight font-semibold tracking-tight">{childTitle(child, i18n)}</h1>
        <p className="mt-1 text-[13px] text-ink-muted">{t.timeline.subtitle}</p>
      </header>
      <Card className="px-4 py-5 sm:px-6">
        <TimelineView events={events} birthDate={child.birthDate} />
      </Card>
    </div>
  );
}
