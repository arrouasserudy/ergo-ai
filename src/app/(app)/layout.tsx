import type { ReactNode } from "react";
import { Sidebar } from "@/components/shell/Sidebar";
import { requireTherapist } from "@/lib/session";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const { therapist, account } = await requireTherapist();

  return (
    <div className="min-h-screen lg:flex">
      <Sidebar therapistName={therapist.name} accountName={account.name} />
      <main className="min-w-0 flex-1 px-4 py-6 sm:px-8 lg:px-10 lg:py-8">{children}</main>
    </div>
  );
}
