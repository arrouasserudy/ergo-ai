import { MessageCircle, Plus } from "lucide-react";
import { notFound } from "next/navigation";
import { AddEventButton } from "@/components/child-events/AddEventButton";
import { ChildTabs } from "@/components/children/ChildTabs";
import { StatusBadge } from "@/components/children/StatusBadge";
import { StartButtons } from "@/components/episodes/StartButtons";
import { AskAmitButton } from "@/components/expert/AskAmitButton";
import { DeadlineBadge } from "@/components/forms/DeadlineBadge";
import { BackLink } from "@/components/ui/BackLink";
import { buttonClass, LinkButton } from "@/components/ui/Button";
import { getI18n } from "@/i18n/server";
import { reportOptions } from "@/lib/child-events/queries";
import { getChild } from "@/lib/children";
import { pendingForms, urgencyByChild } from "@/lib/forms/queries";
import { requireTherapist } from "@/lib/session";
import { localToday } from "@/lib/time";

/**
 * The child file: a compact header (name, age, school level, status, referral reason,
 * primary actions) and the section tabs, shared by every page under `/children/[id]`.
 * An unknown child (or one of another cabinet) is a 404 (`children/not-found.tsx`).
 */
export default async function ChildLayout(props: LayoutProps<"/children/[id]">) {
  const i18n = await getI18n();
  const { t } = i18n;
  const { accountId, account } = await requireTherapist();
  const { id } = await props.params;
  const child = getChild(accountId, id);
  if (!child) notFound();

  const archived = child.status === "archived";
  const meta = [i18n.age(child.birthDate), child.schoolLevel].filter(Boolean).join(" · ");
  const urgency = urgencyByChild(pendingForms(accountId, localToday(), account.deadlineWarnDays)).get(child.id);

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <header className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
          <div className="min-w-0 flex-1 basis-72">
            <BackLink href="/children">{t.children.backToList}</BackLink>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
              <h1 className="text-[24px] leading-tight font-semibold tracking-tight">
                <bdi>{i18n.childName(child)}</bdi>
              </h1>
              {meta && (
                <span dir="auto" className="text-[14px] text-ink-muted">
                  {meta}
                </span>
              )}
              <StatusBadge status={child.status} />
              <DeadlineBadge urgency={urgency} />
            </div>
            {child.referralReason && (
              <p className="mt-1 truncate text-[13px] text-ink-muted" title={child.referralReason}>
                {t.children.reasonMeta(child.referralReason)}
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {!archived && (
              <LinkButton href={`/reports/new?child=${child.id}`}>
                <Plus className="size-4" />
                {t.reports.newButton}
              </LinkButton>
            )}
            {!archived && <AddEventButton childId={child.id} reports={reportOptions(accountId, child.id)} today={localToday()} />}
            {!archived && <StartButtons childId={child.id} kinds={["crisis"]} />}
            <AskAmitButton childId={child.id} className={buttonClass("secondary")}>
              <MessageCircle className="size-4" />
              {t.expert.askExpert}
            </AskAmitButton>
          </div>
        </div>

        {archived && (
          <p className="rounded-xl border border-muted-badge-ink/20 bg-muted-badge px-4 py-2.5 text-[13px] text-muted-badge-ink">
            {t.children.archivedBanner}
          </p>
        )}

        <ChildTabs childId={child.id} />
      </header>

      {props.children}
    </div>
  );
}
