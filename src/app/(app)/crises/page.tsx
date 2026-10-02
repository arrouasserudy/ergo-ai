import { Card, CardHeader } from "@/components/ui/Card";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { RevealButton, RevealPanel, RevealProvider } from "@/components/ui/RevealPanel";
import { EpisodeList } from "@/components/episodes/EpisodeList";
import { OpenEpisodesByChild } from "@/components/episodes/OpenEpisodesByChild";
import { StartEpisodeChooser } from "@/components/episodes/StartEpisodeChooser";
import { getI18n } from "@/i18n/server";
import { listChildren } from "@/lib/children";
import { latestPerChild } from "@/lib/episode-insights";
import { listClosedEpisodesSince, listOpenEpisodes } from "@/lib/episodes";
import { requireTherapist } from "@/lib/session";
import { APP_TIME_ZONE } from "@/lib/time";

const START_PANEL_ID = "start-episode-panel";
const RECENT_DAYS = 30;

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: `${t.nav.crises} · ${t.app.name}` };
}

export default async function CrisesPage() {
  const i18n = await getI18n();
  const { t } = i18n;
  const { accountId } = await requireTherapist();
  const now = new Date();
  const open = listOpenEpisodes(accountId);
  // Fetch a couple of extra days; the exact local-day window is applied by `latestPerChild`.
  const closed = listClosedEpisodesSince(accountId, new Date(now.getTime() - (RECENT_DAYS + 2) * 86_400_000));
  const recent = latestPerChild(closed, { now, timeZone: APP_TIME_ZONE, days: RECENT_DAYS });
  const childOptions = listChildren(accountId, { status: "active" }).map((child) => ({ id: child.id, label: i18n.childName(child) }));

  return (
    <RevealProvider>
      <div className="mx-auto max-w-5xl space-y-5">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <Eyebrow>{t.nav.crises}</Eyebrow>
            <h1 className="mt-1 text-[28px] leading-tight font-semibold tracking-tight">{t.episodes.navTitle}</h1>
            <p className="mt-1 text-[13px] text-ink-muted">{t.episodes.navSubtitle}</p>
          </div>
          <RevealButton label={t.episodes.startTitle} panelId={START_PANEL_ID} />
        </header>

        <RevealPanel title={t.episodes.startTitle} panelId={START_PANEL_ID}>
          <StartEpisodeChooser childOptions={childOptions} />
        </RevealPanel>

        <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2">
          {open.length > 0 && (
            <Card>
              <CardHeader title={t.episodes.openNow} />
              <div className="border-t border-line">
                <OpenEpisodesByChild items={open} />
              </div>
            </Card>
          )}

          <Card className={open.length === 0 ? "lg:col-span-2" : undefined}>
            <CardHeader title={t.episodes.recentTitle} hint={t.episodes.recentHint} />
            {recent.length === 0 ? (
              <p className="px-5 pb-5 text-[13px] text-ink-muted">{t.episodes.recentEmpty}</p>
            ) : (
              <div className="border-t border-line">
                <EpisodeList items={recent} showChild />
              </div>
            )}
          </Card>
        </div>
      </div>
    </RevealProvider>
  );
}
