import { notFound } from "next/navigation";
import { HistoryPanel } from "@/components/episodes/HistoryPanel";
import { OpenEpisodes } from "@/components/episodes/OpenEpisodes";
import { StartButtons } from "@/components/episodes/StartButtons";
import { EPISODE_KINDS } from "@/db/schema";
import { isolate } from "@/i18n";
import { getI18n } from "@/i18n/server";
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

/** Crises tab: episodes in progress, the buttons to start one, and the history of each kind with its patterns. */
export default async function ChildEpisodesPage(props: PageProps<"/children/[id]/episodes">) {
  const { t } = await getI18n();
  const { accountId } = await requireTherapist();
  const { id } = await props.params;
  const child = getChild(accountId, id);
  if (!child) notFound();

  const episodes = listChildEpisodes(accountId, child.id);
  const open = episodes.filter((ep) => ep.status === "open");

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13px] text-ink-muted">{t.episodes.childCardHint}</p>
        {child.status !== "archived" && <StartButtons childId={child.id} kinds={["difficulty"]} />}
      </div>
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
