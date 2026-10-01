import { ArrowRight, ChevronLeft } from "lucide-react";
import Link from "next/link";
import { createReport } from "@/app/actions/reports";
import { Button, LinkButton } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { REPORT_DOC_TYPES } from "@/db/schema";
import { getI18n } from "@/i18n/server";
import { childTitle } from "@/lib/child-title";
import { listChildren } from "@/lib/children";
import { requireTherapist } from "@/lib/session";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: `${t.reports.newEyebrow} · ${t.app.name}` };
}

export default async function NewReportPage(props: PageProps<"/reports/new">) {
  const i18n = await getI18n();
  const { t } = i18n;
  const r = t.reports;
  const { accountId } = await requireTherapist();
  const sp = await props.searchParams;
  const preselected = typeof sp.child === "string" ? sp.child : "";
  const kids = listChildren(accountId);

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Link href="/reports" className="-my-2 inline-flex min-h-11 items-center gap-1 text-[13.5px] text-ink-muted hover:text-ink">
        <ChevronLeft className="size-4 rtl:rotate-180" />
        {r.backToList}
      </Link>
      <header>
        <Eyebrow>{r.newEyebrow}</Eyebrow>
        <h1 className="mt-1 text-[28px] leading-tight font-semibold tracking-tight">{r.newTitle}</h1>
        <p className="mt-1 text-[13px] text-ink-muted">{r.newSubtitle}</p>
      </header>

      <Card>
        {kids.length === 0 ? (
          <div className="flex flex-col items-start gap-3 p-5">
            <p className="text-[14px] text-ink-muted">{r.noChildren}</p>
            <LinkButton href="/children/new">{t.children.addButton}</LinkButton>
          </div>
        ) : (
          <form action={createReport} className="space-y-5 p-5">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="childId" className="text-[12.5px] font-medium text-ink-soft">
                {r.childLabel}
              </label>
              <select
                id="childId"
                name="childId"
                required
                defaultValue={kids.some((c) => c.id === preselected) ? preselected : ""}
                className="h-11 w-full rounded-xl border border-line-strong bg-surface px-3 text-[14px] focus:border-primary focus:ring-2 focus:ring-primary/15 focus:outline-none"
              >
                <option value="" disabled>
                  {r.childPlaceholder}
                </option>
                {kids.map((child) => (
                  <option key={child.id} value={child.id}>
                    {childTitle(child, i18n)} — {child.referralReason}
                  </option>
                ))}
              </select>
            </div>

            <fieldset>
              <legend className="mb-1.5 text-[12.5px] font-medium text-ink-soft">{r.docTypeLabel}</legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {REPORT_DOC_TYPES.map((type, i) => (
                  <label
                    key={type}
                    className="flex cursor-pointer items-center gap-2.5 min-h-11 rounded-xl border border-line-strong px-3 py-2.5 text-[14px] has-checked:border-primary has-checked:bg-tint has-checked:text-tint-ink"
                  >
                    <input type="radio" name="docType" value={type} defaultChecked={i === 0} className="accent-primary" />
                    {r.docType[type]}
                  </label>
                ))}
              </div>
            </fieldset>

            <p className="text-[12px] text-ink-muted">{r.consentReminder}</p>

            <Button type="submit">
              {r.start}
              <ArrowRight className="size-4 rtl:rotate-180" />
            </Button>
          </form>
        )}
      </Card>
    </div>
  );
}
