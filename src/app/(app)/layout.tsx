import type { ReactNode } from "react";
import { UsageTracker } from "@/components/analytics/UsageTracker";
import { AmitBubble } from "@/components/expert/AmitBubble";
import { NotificationBell, type BellItem } from "@/components/shell/NotificationBell";
import { Sidebar } from "@/components/shell/Sidebar";
import { getI18n } from "@/i18n/server";
import { syncAutoFormsDaily } from "@/lib/forms/auto-assign";
import { pendingForms } from "@/lib/forms/queries";
import { requireTherapist } from "@/lib/session";
import { localToday } from "@/lib/time";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const { therapist, account, accountId } = await requireTherapist();
  const i18n = await getI18n();
  const { t } = i18n;

  // New yearly copies appear when the school year starts; then list what is due.
  syncAutoFormsDaily(accountId);
  const bellItems: BellItem[] = pendingForms(accountId, localToday(), account.deadlineWarnDays).map((form) => ({
    id: form.id,
    href: `/children/${form.child.id}/forms/${form.id}`,
    childName: i18n.childName(form.child),
    title: form.title,
    dueLabel: (form.level === "overdue" ? t.forms.due.overdue : t.forms.due.before)(i18n.dayMonth(form.dueDate.slice(5))),
    level: form.level,
  }));

  return (
    <div className="min-h-dvh md:flex">
      <Sidebar therapistName={therapist.name} therapistEmail={therapist.email} accountName={account.name} crisesEnabled={account.crisesEnabled} bell={<NotificationBell items={bellItems} />} />
      <main className="min-w-0 flex-1 px-4 pt-5 pb-[calc(max(1rem,env(safe-area-inset-bottom))+5rem)] md:px-8 md:pt-3 xl:px-12 xl:pt-4">
        <div className="-mb-2 hidden justify-end md:flex">
          <NotificationBell items={bellItems} />
        </div>
        {children}
      </main>
      {/* Amit, the expert colleague, on every page; the bottom padding above keeps content clear of its button. */}
      <AmitBubble />
      <UsageTracker />
    </div>
  );
}
