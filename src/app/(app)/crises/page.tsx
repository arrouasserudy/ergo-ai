import { Avatar } from "@/components/ui/Avatar";
import { Card, CardHeader } from "@/components/ui/Card";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { EpisodeList } from "@/components/episodes/EpisodeList";
import { OpenEpisodes } from "@/components/episodes/OpenEpisodes";
import { StartButtons } from "@/components/episodes/StartButtons";
import { LinkButton } from "@/components/ui/Button";
import { getI18n } from "@/i18n/server";
import { listChildren } from "@/lib/children";
import { listAccountEpisodes } from "@/lib/episodes";
import { requireTherapist } from "@/lib/session";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: `${t.nav.crises} · ${t.app.name}` };
}

export default async function CrisesPage() {
  const i18n = await getI18n();
  const { t } = i18n;
  const { accountId } = await requireTherapist();
  const items = listAccountEpisodes(accountId);
  const open = items.filter((i) => i.episode.status === "open");
  const recent = items.filter((i) => i.episode.status === "closed");
  const kids = listChildren(accountId, { status: "active" });

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <header>
        <Eyebrow>{t.nav.crises}</Eyebrow>
        <h1 className="mt-1 font-serif text-[32px] leading-tight font-medium">{t.episodes.navTitle}</h1>
        <p className="mt-1 text-[13px] text-ink-muted">{t.episodes.navSubtitle}</p>
      </header>

      <OpenEpisodes items={open} />

      <div className="grid items-start gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader title={t.episodes.startTitle} hint={t.episodes.startHint} />
          {kids.length === 0 ? (
            <div className="px-5 pb-5">
              <p className="mb-3 text-[13px] text-ink-muted">{t.episodes.noChildren}</p>
              <LinkButton href="/children/new" variant="secondary">
                {t.children.addButton}
              </LinkButton>
            </div>
          ) : (
            <ul className="divide-y divide-line border-t border-line">
              {kids.map((child) => (
                <li key={child.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                  <span className="flex items-center gap-3">
                    <Avatar name={child.name} />
                    <span>
                      <bdi className="block text-[14px] font-medium">{child.name}</bdi>
                      <span className="block text-[11.5px] text-ink-muted">{i18n.age(child.birthDate) ?? "—"}</span>
                    </span>
                  </span>
                  <StartButtons childId={child.id} size="sm" />
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader title={t.episodes.recentAll} />
          {recent.length === 0 ? (
            <p className="px-5 pb-5 text-[13px] text-ink-muted">{t.episodes.none}</p>
          ) : (
            <div className="border-t border-line">
              <EpisodeList items={recent} showChild />
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
