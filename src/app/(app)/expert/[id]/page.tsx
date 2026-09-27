import { notFound } from "next/navigation";
import { ChatView } from "@/components/expert/ChatView";
import { getI18n } from "@/i18n/server";
import { getChild } from "@/lib/children";
import { getConversation, listMessages } from "@/lib/expert/conversations";
import { toDisplayTurns } from "@/lib/expert/display";
import { requireTherapist } from "@/lib/session";

export async function generateMetadata(props: PageProps<"/expert/[id]">) {
  const { t } = await getI18n();
  const { accountId, therapist } = await requireTherapist();
  const conversation = getConversation(accountId, therapist.id, (await props.params).id);
  return { title: `${conversation?.title ?? t.nav.expert} · ${t.app.name}` };
}

export default async function ConversationPage(props: PageProps<"/expert/[id]">) {
  const { accountId, therapist } = await requireTherapist();
  const { id } = await props.params;
  const conversation = getConversation(accountId, therapist.id, id);
  if (!conversation) notFound();

  const child = conversation.childId ? getChild(accountId, conversation.childId) : null;
  const turns = toDisplayTurns(listMessages(conversation.id), conversation.provider);

  return (
    <ChatView
      key={conversation.id}
      conversationId={conversation.id}
      initialTurns={turns}
      childOptions={[]}
      child={child ? { id: child.id, name: child.name } : null}
    />
  );
}
