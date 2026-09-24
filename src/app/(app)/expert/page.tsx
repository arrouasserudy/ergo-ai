import { ChatView } from "@/components/expert/ChatView";
import { getI18n } from "@/i18n/server";
import { listChildren } from "@/lib/children";
import { requireTherapist } from "@/lib/session";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: `${t.nav.expert} · ${t.app.name}` };
}

export default async function NewConversationPage(props: PageProps<"/expert">) {
  const { accountId } = await requireTherapist();
  const sp = await props.searchParams;
  const childOptions = listChildren(accountId, { status: "active" }).map(({ id, initials }) => ({ id, initials }));
  const preselected = typeof sp.child === "string" ? (childOptions.find((c) => c.id === sp.child) ?? null) : null;

  // Keyed so "Nouvelle discussion" always starts from a clean state.
  return <ChatView key={preselected?.id ?? "new"} conversationId={null} initialTurns={[]} childOptions={childOptions} child={preselected} />;
}
