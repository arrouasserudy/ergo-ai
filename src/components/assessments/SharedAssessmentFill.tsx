"use client";

import { Loader2, Send } from "lucide-react";
import { useState, useTransition } from "react";
import { saveSharedAssessment, submitSharedAssessment } from "@/app/actions/shared-assessments";
import { Thanks } from "@/components/forms/SharedFormFill";
import { Button } from "@/components/ui/Button";
import { FormError } from "@/components/ui/FormError";
import { SaveIndicator } from "@/components/ui/SaveIndicator";
import { useI18n } from "@/i18n/client";
import { getDefinition } from "@/lib/assessments/registry";
import type { AssessmentAnswers } from "@/lib/assessments/types";
import { AssessmentForm } from "./AssessmentForm";
import { useAssessmentAnswers } from "./useAssessmentAnswers";

/** A questionnaire as the parents fill it in through their private link (autosaved; no scores). */
export function SharedAssessmentFill({ token, definitionId, initial }: { token: string; definitionId: string; initial: AssessmentAnswers }) {
  const { t } = useI18n();
  const a = t.assessments;
  const definition = getDefinition(definitionId)!;
  const { answers, update, saveState, flush } = useAssessmentAnswers(initial, (next) => saveSharedAssessment(token, next));
  const [missing, setMissing] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();

  const submit = () =>
    startTransition(async () => {
      flush();
      const result = await submitSharedAssessment(token, answers);
      if (result.ok) {
        setDone(true);
        window.scrollTo({ top: 0 });
        return;
      }
      setMissing(result.missing ?? []);
      setError(result.missing?.length ? a.public.missing(result.missing.length) : (a.errors[result.error] ?? a.errors.generic));
      if (result.missing?.[0]) document.getElementById(`shared-${result.missing[0]}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    });

  if (done) return <Thanks />;

  return (
    <div className="space-y-6">
      <AssessmentForm definitionId={definition.id} answers={answers} onChange={update} missing={missing} idPrefix="shared" />
      <FormError message={error ?? undefined} />
      <div className="flex flex-wrap items-center gap-3 border-t border-line pt-4">
        <Button onClick={submit} disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4 rtl:-scale-x-100" />}
          {t.forms.public.submit}
        </Button>
        <SaveIndicator state={saveState} />
      </div>
    </div>
  );
}
