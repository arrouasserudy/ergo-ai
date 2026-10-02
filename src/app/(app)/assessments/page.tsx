import { ChevronRight, Gauge } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader } from "@/components/ui/Card";
import { getI18n } from "@/i18n/server";
import { ASSESSMENTS } from "@/lib/assessments/registry";
import { requireTherapist } from "@/lib/session";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: `${t.assessments.listTitle} · ${t.app.name}` };
}

export default async function AssessmentsPage() {
  const i18n = await getI18n();
  const a = i18n.t.assessments;
  await requireTherapist();

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <header>
        <h1 className="text-[28px] leading-tight font-semibold tracking-tight">{a.listTitle}</h1>
        <p className="mt-1 max-w-2xl text-[13px] text-ink-muted">{a.listSubtitle}</p>
      </header>

      <Card>
        <CardHeader title={a.catalogTitle} />
        <ul className="divide-y divide-line border-t border-line">
          {ASSESSMENTS.map((d) => (
            <li key={d.id}>
              <Link
                href={`/assessments/${d.id}`}
                className="flex flex-wrap items-center gap-x-3 gap-y-1 px-5 py-3.5 transition-colors outline-none hover:bg-surface-muted focus-visible:bg-surface-muted focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-inset"
              >
                <Gauge className="size-4 shrink-0 text-ink-muted" />
                <span className="min-w-0 flex-1">
                  <bdi className="block text-[14px] font-medium">{d.name}</bdi>
                  <span className="block text-[12px] text-ink-muted">
                    {a.items(d.sections.reduce((n, s) => n + s.items.length, 0))}
                    {d.ageRange && ` · ${a.ageRange(a.age(d.ageRange.minMonths), a.age(d.ageRange.maxMonths))}`}
                  </span>
                </span>
                {d.respondents.map((r) => (
                  <Badge key={r} tone={r === "parent" ? "tint" : "muted"}>
                    {a.respondents[r]}
                  </Badge>
                ))}
                <ChevronRight className="size-4 shrink-0 text-ink-muted rtl:rotate-180" />
              </Link>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
