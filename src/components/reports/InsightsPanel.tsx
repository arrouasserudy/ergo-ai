"use client";

import clsx from "clsx";
import { Check, Info, Loader2, Undo2, WandSparkles, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { FormError } from "@/components/ui/FormError";
import type { ReportInsight, ReportInsightKind } from "@/db/schema";
import { useI18n } from "@/i18n/client";
import { validatedInsights } from "@/lib/reports/insights";

const KIND_TONE: Record<ReportInsightKind, string> = {
  hypothesis: "bg-info text-info-ink",
  recommendation: "bg-tint text-tint-ink",
  home_activity: "bg-ok text-ok-ink",
  to_check: "bg-warn text-warn-ink",
};

type InsightsPanelProps = {
  insights: ReportInsight[];
  dir: "ltr" | "rtl";
  onChange: (insights: ReportInsight[]) => void;
  onRewrite: () => void;
  rewriting: boolean;
  /** Another generation is running on this version. */
  busy: boolean;
  error: string | null;
};

/**
 * The model's clinical ideas, apart from the report: validated or dismissed one by
 * one, then written into the report on request. Applied ones stay listed, read-only.
 */
export function InsightsPanel({ insights, dir, onChange, onRewrite, rewriting, busy, error }: InsightsPanelProps) {
  const r = useI18n().t.reports.insights;
  const set = (id: string, patch: Partial<Pick<ReportInsight, "text" | "status">>) => onChange(insights.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  const count = validatedInsights(insights).length;

  return (
    <Card>
      <CardHeader title={r.title} hint={r.hint} />
      <div className="space-y-3 px-5 pb-5">
        {insights.length === 0 ? (
          <p className="text-[13px] text-ink-muted">{r.none}</p>
        ) : (
          <ul className="space-y-2.5" dir={dir}>
            {insights.map((insight) => {
              const editable = insight.status === "pending" || insight.status === "validated";
              return (
                <li
                  key={insight.id}
                  className={clsx(
                    "space-y-2 rounded-xl border p-3",
                    insight.status === "validated" ? "border-primary/40 bg-surface" : "border-line bg-surface-muted",
                    (insight.status === "dismissed" || insight.status === "applied") && "opacity-70",
                  )}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={clsx("rounded-full px-2 py-0.5 text-[11.5px] font-medium", KIND_TONE[insight.kind])}>{r.kind[insight.kind]}</span>
                    {insight.status === "applied" && (
                      <span className="inline-flex items-center gap-1 text-[12px] text-ok-ink">
                        <Check className="size-3.5" />
                        {r.applied}
                      </span>
                    )}
                  </div>
                  {editable ? (
                    <textarea
                      dir="auto"
                      value={insight.text}
                      onChange={(e) => set(insight.id, { text: e.target.value })}
                      aria-label={r.textLabel}
                      maxLength={2000}
                      className="field-sizing-content min-h-10 w-full resize-none rounded-md bg-transparent px-1.5 py-1 text-[14px] leading-relaxed focus:bg-surface focus:ring-2 focus:ring-primary/15 focus:outline-none"
                    />
                  ) : (
                    <p dir="auto" className={clsx("px-1.5 text-[14px] leading-relaxed", insight.status === "dismissed" && "line-through")}>
                      {insight.text}
                    </p>
                  )}
                  {insight.basis && (
                    <p dir="auto" className="px-1.5 text-[12px] text-ink-muted">
                      {r.basis(insight.basis)}
                    </p>
                  )}
                  {insight.status !== "applied" && (
                    <div className="flex flex-wrap items-center gap-2">
                      {insight.status === "pending" ? (
                        <>
                          <Button size="sm" variant="secondary" onClick={() => set(insight.id, { status: "validated" })}>
                            <Check className="size-3.5" />
                            {r.validate}
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => set(insight.id, { status: "dismissed" })}>
                            <X className="size-3.5" />
                            {r.dismiss}
                          </Button>
                        </>
                      ) : (
                        <>
                          <span className={clsx("text-[12.5px] font-medium", insight.status === "validated" ? "text-primary" : "text-ink-muted")}>
                            {insight.status === "validated" ? r.validated : r.dismissed}
                          </span>
                          <Button size="sm" variant="ghost" onClick={() => set(insight.id, { status: "pending" })}>
                            <Undo2 className="size-3.5" />
                            {r.undo}
                          </Button>
                        </>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {error && <FormError message={error} />}

        {insights.some((i) => i.status !== "applied") && (
          <div className="space-y-2 border-t border-line pt-4">
            <Button onClick={onRewrite} disabled={count === 0 || rewriting || busy} className="w-full sm:w-auto">
              {rewriting ? <Loader2 className="size-4 animate-spin" /> : <WandSparkles className="size-4" />}
              {rewriting ? r.rewriting : count === 0 ? r.rewriteNone : r.rewrite(count)}
            </Button>
            <p className="flex gap-1.5 text-[12px] text-ink-muted">
              <Info className="mt-0.5 size-3.5 shrink-0" />
              {r.rewriteHint}
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}
