import type { ReactNode } from "react";
import { Sidebar } from "@/components/shell/Sidebar";
import { actionCount } from "@/lib/reminders";
import { requireTherapist } from "@/lib/session";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const { therapist, account } = await requireTherapist();

  return (
    <div className="min-h-dvh md:flex">
      <Sidebar therapistName={therapist.name} accountName={account.name} reminderCount={actionCount(account)} />
      <main className="min-w-0 flex-1 px-4 pt-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] md:px-8 md:pt-7 xl:px-10 xl:pt-8">{children}</main>
    </div>
  );
}
