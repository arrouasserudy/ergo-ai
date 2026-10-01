import { ChevronLeft, MessageCircle } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { HistoryPanel } from "@/components/episodes/HistoryPanel";
import { OpenEpisodes } from "@/components/episodes/OpenEpisodes";
import { StartButtons } from "@/components/episodes/StartButtons";
import { LinkButton } from "@/components/ui/Button";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { EPISODE_KINDS } from "@/db/schema";
import { isolate } from "@/i18n";
import { getI18n } from "@/i18n/server";
import { childTitle } from "@/lib/child-title";
import { getChild } from "@/lib/children";
import { listChildEpisodes } from "@/lib/episodes";
import { requireTherapist } from "@/lib/session";

export async function generateMetadata(props: PageProps<"/children/[id]/episodes">) {
  const i18n = await getI18n();
  const { t } = i18n;
  const { accountId } = await requireTherapist();
  const child = getChild(accountId, (await props.params).id);
  return { title: `${t.episodes.historyPageTitle} · ${child ? isolate(i18n.childName(child)) : ""} · ${t.app.name}` };
}

export default async function ChildEpisodesPage(props: PageProps<"/children/[id]/episodes">) {
  const i18n = await getI18n();
  const { t } = i18n;
  const { accountId } = await requireTherapist();
  const { id } = await props.params;
  const child = getChild(accountId, id);
  if (!child) notFound();

  const episodes = listChildEpisodes(accountId, child.id);
  const open = episodes.filter((ep) => ep.status === "open");

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <Link href={`/children/${child.id}`} className="-my-2 inline-flex min-h-11 items-center gap-1 text-[13.5px] text-ink-muted hover:text-ink">
        <ChevronLeft className="size-4 rtl:rotate-180" />
        {t.episodes.backToChild(isolate(i18n.childName(child)))}
      </Link>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Eyebrow>{t.episodes.historyPageTitle}</Eyebrow>
          <h1 className="mt-1 text-[28px] leading-tight font-semibold tracking-tight">{childTitle(child, i18n)}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <StartButtons childId={child.id} />
          <LinkButton href={`/expert?child=${child.id}`} variant="secondary">
            <MessageCircle className="size-4" />
            {t.expert.askExpert}
          </LinkButton>
        </div>
      </header>
      <OpenEpisodes items={open.map((episode) => ({ episode, child }))} />
      {EPISODE_KINDS.map((kind) => (
        <HistoryPanel
          key={kind}
          episodes={episodes}
          kind={kind}
          title={t.episodes.panelTitle[kind]}
          childId={child.id}
          limit={500}
          showLinkToAll={false}
        />
      ))}
    </div>
  );
}
