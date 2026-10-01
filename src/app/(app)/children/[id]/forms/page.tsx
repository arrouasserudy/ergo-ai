import { notFound } from "next/navigation";
import { AssessmentsCard } from "@/components/assessments/AssessmentsCard";
import { ChildFormsCard } from "@/components/forms/ChildFormsCard";
import { isolate } from "@/i18n";
import { getI18n } from "@/i18n/server";
import { getChild } from "@/lib/children";
import { requireTherapist } from "@/lib/session";

export async function generateMetadata(props: PageProps<"/children/[id]/forms">) {
  const i18n = await getI18n();
  const { t } = i18n;
  const { accountId } = await requireTherapist();
  const child = getChild(accountId, (await props.params).id);
  return { title: `${t.children.tabs.forms} · ${child ? isolate(i18n.childName(child)) : ""} · ${t.app.name}` };
}

/** "Forms & tests" tab: questionnaires and OT tests of the child (`/children/[id]/assessments` redirects here). */
export default async function ChildFormsPage(props: PageProps<"/children/[id]/forms">) {
  const { accountId, account } = await requireTherapist();
  const { id } = await props.params;
  const child = getChild(accountId, id);
  if (!child) notFound();
  const archived = child.status === "archived";

  return (
    <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <ChildFormsCard accountId={accountId} childId={child.id} archived={archived} warnDays={account.deadlineWarnDays} />
      <AssessmentsCard accountId={accountId} childId={child.id} archived={archived} />
    </div>
  );
}
