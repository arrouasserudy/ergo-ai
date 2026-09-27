import { ChatView } from "@/components/expert/ChatView";
import { getI18n } from "@/i18n/server";
import { listChildren } from "@/lib/children";
import { getEpisode } from "@/lib/episodes";
import { requireTherapist } from "@/lib/session";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: `${t.nav.expert} · ${t.app.name}` };
}

export default async function NewConversationPage(props: PageProps<"/expert">) {
  const { accountId } = await requireTherapist();
  const sp = await props.searchParams;
  const childOptions = listChildren(accountId, { status: "active" }).map(({ id, name }) => ({ id, name }));
  const preselected = typeof sp.child === "string" ? (childOptions.find((c) => c.id === sp.child) ?? null) : null;
  // "Ask Amit" from an episode in progress: that episode is sent as context and the question asked right away.
  const episode = preselected && typeof sp.episode === "string" ? getEpisode(accountId, sp.episode) : undefined;
  const liveEpisode = episode && episode.childId === preselected?.id && episode.status === "open" ? { id: episode.id, kind: episode.kind } : null;

  // Keyed so "Nouvelle discussion" always starts from a clean state.
  return (
    <ChatView
      key={`${preselected?.id ?? "new"}:${liveEpisode?.id ?? ""}`}
      conversationId={null}
      initialTurns={[]}
      childOptions={childOptions}
      child={preselected}
      liveEpisode={liveEpisode}
    />
  );
}
