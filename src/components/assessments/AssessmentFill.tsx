"use client";

import { Calculator, Loader2 } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { completeAssessment, saveAssessmentAnswers } from "@/app/actions/assessments";
import { Button } from "@/components/ui/Button";
import { FormError } from "@/components/ui/FormError";
import { SaveIndicator } from "@/components/ui/SaveIndicator";
import { useI18n } from "@/i18n/client";
import { unanswered } from "@/lib/assessments/answers";
import { getDefinition } from "@/lib/assessments/registry";
import type { AssessmentAnswers } from "@/lib/assessments/types";
import { AssessmentForm } from "./AssessmentForm";
import { ScoreSummary } from "./ScoreSummary";
import { useAssessmentAnswers } from "./useAssessmentAnswers";

type Props = { id: string; definitionId: string; initial: AssessmentAnswers; ageMonths: number | null };

/** A test entered by the therapist: autosaved, provisional scores live, then completed. */
export function AssessmentFill({ id, definitionId, initial, ageMonths }: Props) {
  const { t } = useI18n();
  const a = t.assessments;
  const definition = getDefinition(definitionId)!;
  const { answers, update, saveState, flush } = useAssessmentAnswers(initial, (next) => saveAssessmentAnswers(id, next));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const scores = useMemo(() => definition.score(answers, { ageMonths }), [definition, answers, ageMonths]);
  const left = unanswered(definition, answers).length;

  const complete = () =>
    startTransition(async () => {
      flush();
      const result = await completeAssessment(id, answers);
      if (!result.ok) setError(a.errors[result.error] ?? a.errors.generic);
    });

  return (
    <div className="space-y-8">
      <AssessmentForm definitionId={definition.id} answers={answers} onChange={update} idPrefix="fill" />

      <details className="rounded-xl border border-line p-4">
        <summary className="cursor-pointer text-[13.5px] font-medium">{a.liveResults}</summary>
        <div className="mt-4">
          <ScoreSummary groups={scores} language={definition.language} />
        </div>
      </details>

      <div className="space-y-3 border-t border-line pt-4">
        {left > 0 && <p className="text-[12.5px] text-warn-ink">{a.unansweredWarning(left)}</p>}
        <FormError message={error ?? undefined} />
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={complete} disabled={pending}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : <Calculator className="size-4" />}
            {a.complete}
          </Button>
          <SaveIndicator state={saveState} />
        </div>
      </div>
    </div>
  );
}
