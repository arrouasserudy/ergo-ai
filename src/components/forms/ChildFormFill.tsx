"use client";

import { CheckCircle2, Loader2 } from "lucide-react";
import { useState, useTransition } from "react";
import { saveChildFormAnswers, submitChildForm } from "@/app/actions/child-forms";
import { Button } from "@/components/ui/Button";
import { FormError } from "@/components/ui/FormError";
import { SaveIndicator } from "@/components/ui/SaveIndicator";
import { useI18n } from "@/i18n/client";
import type { Answers, FormSchema } from "@/lib/forms/schema";
import { FormRenderer } from "./FormRenderer";
import { useAnswers } from "./useAnswers";

/** A child's form filled in by the therapist, autosaved, then marked as completed. */
export function ChildFormFill({ id, form, initial }: { id: string; form: FormSchema; initial: Answers }) {
  const { t } = useI18n();
  const f = t.forms;
  const { answers, setAnswer, saveState, flush } = useAnswers(initial, (a) => saveChildFormAnswers(id, a));
  const [missing, setMissing] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = () =>
    startTransition(async () => {
      flush();
      const result = await submitChildForm(id, answers);
      if (result.ok) return;
      setMissing(result.missing ?? []);
      setError(result.missing?.length ? f.missing(result.missing.length) : (f.errors[result.error] ?? f.errors.generic));
      if (result.missing?.[0]) document.getElementById(`fill-${result.missing[0]}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    });

  return (
    <div className="space-y-6">
      <FormRenderer
        form={form}
        answers={answers}
        idPrefix="fill"
        hideTitle
        missing={missing}
        onChange={(fieldId, answer) => {
          setAnswer(fieldId, answer);
          if (missing.includes(fieldId)) setMissing(missing.filter((m) => m !== fieldId));
        }}
      />
      <FormError message={error ?? undefined} />
      <div className="flex flex-wrap items-center gap-3 border-t border-line pt-4">
        <Button onClick={submit} disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
          {f.submit}
        </Button>
        <SaveIndicator state={saveState} />
      </div>
    </div>
  );
}
