import { eq } from "drizzle-orm";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ReportEditor } from "@/components/reports/ReportEditor";
import { db } from "@/db";
import { therapists } from "@/db/schema";
import { isolate } from "@/i18n";
import { getI18n } from "@/i18n/server";
import { childTitle } from "@/lib/child-title";
import { getChild } from "@/lib/children";
import { getReport, listVariants } from "@/lib/reports/queries";
import { transcriptionAvailable } from "@/lib/reports/transcribe";
import { requireTherapist } from "@/lib/session";
import { APP_TIME_ZONE } from "@/lib/time";

async function load(id: string) {
  const { accountId } = await requireTherapist();
  const report = getReport(accountId, id);
  const child = report && getChild(accountId, report.childId);
  return report && child ? { report, child } : null;
}

export async function generateMetadata(props: PageProps<"/reports/[id]">) {
  const { t } = await getI18n();
  const found = await load((await props.params).id);
  return { title: `${found ? `${isolate(found.child.name)} · ` : ""}${t.reports.listTitle} · ${t.app.name}` };
}

export default async function ReportPage(props: PageProps<"/reports/[id]">) {
  const i18n = await getI18n();
  const { account, therapist } = await requireTherapist();
  const found = await load((await props.params).id);
  if (!found) notFound();
  const { report, child } = found;

  // The report is signed by its author (or whoever exports it, if the author left).
  const author = report.authorId ? db.select({ name: therapists.name }).from(therapists).where(eq(therapists.id, report.authorId)).get() : undefined;

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <Link href="/reports" className="inline-flex items-center gap-1 text-[13px] text-ink-muted hover:text-ink">
        <ChevronLeft className="size-4 rtl:rotate-180" />
        {i18n.t.reports.backToList}
      </Link>
      <ReportEditor
        report={report}
        variants={listVariants(report.id)}
        child={{ name: child.name, title: childTitle(child, i18n), referralReason: child.referralReason }}
        exportContext={{ accountName: account.name, letterhead: account.letterhead, therapistName: author?.name ?? therapist.name, timeZone: APP_TIME_ZONE }}
        dictationAvailable={transcriptionAvailable()}
      />
    </div>
  );
}
