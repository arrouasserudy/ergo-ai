import { notFound } from "next/navigation";
import { EpisodeScreen } from "@/components/episodes/EpisodeScreen";
import { HistoryPanel } from "@/components/episodes/HistoryPanel";
import { BackLink } from "@/components/ui/BackLink";
import { isolate } from "@/i18n";
import { getI18n } from "@/i18n/server";
import { getChild } from "@/lib/children";
import { rankHelped } from "@/lib/episode-insights";
import { getEpisode, listChildEpisodes } from "@/lib/episodes";
import { CALMING_STRATEGY_OPTIONS } from "@/lib/options";
import { requireTherapist } from "@/lib/session";
import { minutesBetween } from "@/lib/time";

export async function generateMetadata(props: PageProps<"/children/[id]/episodes/[episodeId]">) {
  const i18n = await getI18n();
  const { t } = i18n;
  const { accountId } = await requireTherapist();
  const { id } = await props.params;
  const child = getChild(accountId, id);
  return { title: `${t.nav.crises} · ${child ? isolate(i18n.childName(child)) : ""} · ${t.app.name}` };
}

export default async function EpisodePage(props: PageProps<"/children/[id]/episodes/[episodeId]">) {
  const i18n = await getI18n();
  const { t } = i18n;
  const { accountId } = await requireTherapist();
  const { id, episodeId } = await props.params;
  const child = getChild(accountId, id);
  const episode = getEpisode(accountId, episodeId);
  if (!child || !episode || episode.childId !== child.id) notFound();

  const all = listChildEpisodes(accountId, child.id);
  // Only past, finished episodes of the same kind inform the check-list.
  const history = all.filter((ep) => ep.id !== episode.id && ep.status === "closed" && ep.kind === episode.kind);

  return (
    <div className="space-y-5">
      <BackLink href={`/children/${child.id}/episodes`}>{t.children.tabs.crises}</BackLink>
      <EpisodeScreen
        key={episode.id}
        episode={episode}
        child={{ id: child.id, knownTriggers: child.knownTriggers }}
        profile={{
          hyperSensitivities: child.hyperSensitivities,
          hypoReactivities: child.hypoReactivities,
          backgroundFactors: child.backgroundFactors,
          seeksDeepPressure: child.seeksDeepPressure,
        }}
        history={history.map(({ kind, situation, causes, helped, startedAt }) => ({ kind, situation, causes, helped, startedAt }))}
        helpedOptions={rankHelped(history, child.calmingStrategies, CALMING_STRATEGY_OPTIONS)}
        closedMeta={
          episode.status === "closed"
            ? t.episodes.closedMeta(i18n.dateTime(episode.startedAt), episode.endedAt ? minutesBetween(episode.startedAt, episode.endedAt) : null)
            : undefined
        }
        historyPanel={<HistoryPanel episodes={all} kind={episode.kind} childId={child.id} currentId={episode.id} />}
      />
    </div>
  );
}
