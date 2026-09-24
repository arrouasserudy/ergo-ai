import type { ReactNode } from "react";
import { ConversationLinks } from "@/components/expert/ConversationLinks";
import { listConversations } from "@/lib/expert/conversations";
import { requireTherapist } from "@/lib/session";

export default async function ExpertLayout({ children }: { children: ReactNode }) {
  const { accountId, therapist } = await requireTherapist();
  const items = listConversations(accountId, therapist.id).map(({ id, title }) => ({ id, title }));

  return (
    <div className="mx-auto grid max-w-6xl gap-5 lg:grid-cols-[240px_1fr]">
      <aside className="order-2 lg:order-1">
        <ConversationLinks items={items} />
      </aside>
      <div className="order-1 min-w-0 lg:order-2">{children}</div>
    </div>
  );
}
