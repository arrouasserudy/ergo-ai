"use client";

import { CheckCircle2, Loader2, Send } from "lucide-react";
import { useState, useTransition } from "react";
import { saveSharedAnswers, submitSharedForm } from "@/app/actions/shared-forms";
import { Button } from "@/components/ui/Button";
import { FormError } from "@/components/ui/FormError";
import { SaveIndicator } from "@/components/ui/SaveIndicator";
import { useI18n } from "@/i18n/client";
import type { Answers, FormSchema } from "@/lib/forms/schema";
import { FormRenderer } from "./FormRenderer";
import { useAnswers } from "./useAnswers";

/** The form as the parents fill it in, through their private link (autosaved). */
export function SharedFormFill({ token, form, initial }: { token: string; form: FormSchema; initial: Answers }) {
  const { t } = useI18n();
  const f = t.forms;
  const { answers, setAnswer, saveState, flush } = useAnswers(initial, (a) => saveSharedAnswers(token, a));
  const [missing, setMissing] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();

  const submit = () =>
    startTransition(async () => {
      flush();
      const result = await submitSharedForm(token, answers);
      if (result.ok) {
        setDone(true);
        window.scrollTo({ top: 0 });
        return;
      }
      setMissing(result.missing ?? []);
      setError(result.missing?.length ? f.missing(result.missing.length) : (f.errors[result.error] ?? f.errors.generic));
      if (result.missing?.[0]) document.getElementById(`shared-${result.missing[0]}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    });

  if (done) return <Thanks />;

  return (
    <div className="space-y-6">
      <FormRenderer
        form={form}
        answers={answers}
        idPrefix="shared"
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
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4 rtl:-scale-x-100" />}
          {f.public.submit}
        </Button>
        <SaveIndicator state={saveState} />
      </div>
    </div>
  );
}

export function Thanks() {
  const { t } = useI18n();
  return (
    <div className="flex flex-col items-center gap-3 py-10 text-center">
      <span className="grid size-12 place-items-center rounded-full bg-ok text-ok-ink">
        <CheckCircle2 className="size-6" />
      </span>
      <p className="text-xl font-semibold tracking-tight">{t.forms.public.thanksTitle}</p>
      <p className="max-w-md text-[14px] text-ink-muted">{t.forms.public.thanksBody}</p>
    </div>
  );
}
