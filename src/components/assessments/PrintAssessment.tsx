"use client";

import { Printer } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/Button";
import { useI18n } from "@/i18n/client";
import { getDefinition } from "@/lib/assessments/registry";
import type { AssessmentAnswers, ScoreGroup } from "@/lib/assessments/types";
import { AssessmentForm } from "./AssessmentForm";
import { ScoreSummary } from "./ScoreSummary";

type Props = {
  definitionId: string;
  answers: AssessmentAnswers;
  scores: ScoreGroup[];
  previous: { date: string; groups: ScoreGroup[] } | null;
  letterhead: string[];
  meta: string[];
  fileName: string;
};

/** "Print / PDF": scores then answers, with the letterhead, printed alone (see .print-root in globals.css). */
export function PrintAssessment({ definitionId, answers, scores, previous, letterhead, meta, fileName }: Props) {
  const { t } = useI18n();
  const definition = getDefinition(definitionId)!;
  const [printing, setPrinting] = useState(false);

  useEffect(() => {
    if (!printing) return;
    // The page title becomes the suggested PDF file name.
    const title = document.title;
    document.title = fileName;
    const done = () => setPrinting(false);
    window.addEventListener("afterprint", done, { once: true });
    window.print();
    return () => {
      document.title = title;
      window.removeEventListener("afterprint", done);
    };
  }, [printing, fileName]);

  return (
    <>
      <Button variant="secondary" onClick={() => setPrinting(true)}>
        <Printer className="size-4" />
        {t.assessments.print}
      </Button>
      {printing &&
        createPortal(
          <div className="print-root space-y-6 font-sans text-[10pt] leading-relaxed text-black">
            {letterhead.length > 0 && (
              <header className="border-b border-neutral-300 pb-3">
                {letterhead.map((line, i) => (
                  <p key={i} className={i === 0 ? "text-[12pt] font-semibold" : "text-[9pt] text-neutral-600"}>
                    {line}
                  </p>
                ))}
              </header>
            )}
            <div>
              <h1 className="text-[15pt] font-semibold">{definition.name}</h1>
              {meta.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </div>
            <ScoreSummary groups={scores} language={definition.language} previous={previous} print />
            <AssessmentForm definitionId={definition.id} answers={answers} mode="print" idPrefix="print" />
          </div>,
          document.body,
        )}
    </>
  );
}
