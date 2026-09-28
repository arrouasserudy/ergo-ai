"use client";

import { CheckCircle2, Loader2, Upload } from "lucide-react";
import { useActionState, useRef } from "react";
import type { FormState } from "@/app/actions/children";
import { uploadChildFile } from "@/app/actions/files";
import { Button } from "@/components/ui/Button";
import { InputField } from "@/components/ui/Field";
import { FormError } from "@/components/ui/FormError";
import { CHILD_FILE_KINDS } from "@/db/schema";
import { useI18n } from "@/i18n/client";

const today = () => new Date().toISOString().slice(0, 10);

/** Files a form (assessment, questionnaire, consent…) in the child's record. */
export function FileUploadForm({ childId, accept }: { childId: string; accept: string }) {
  const i18n = useI18n();
  const f = i18n.t.files;
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action, pending] = useActionState<FormState, FormData>(async (prev, formData) => {
    const result = await uploadChildFile(childId, prev, formData);
    if (result.ok) formRef.current?.reset();
    return result;
  }, { ok: false });
  const errors = state.errors ?? {};
  const values = (state.values ?? {}) as Record<string, string>;

  return (
    <form ref={formRef} action={action} className="space-y-4">
      {state.ok && state.addedName && (
        <p role="status" className="flex items-center gap-2 rounded-lg bg-ok px-3 py-2 text-[13px] text-ok-ink">
          <CheckCircle2 className="size-4" />
          <bdi>{f.added(state.addedName)}</bdi>
        </p>
      )}
      <FormError message={i18n.error(errors.form)} />
      <fieldset>
        <legend className="mb-1.5 text-[12.5px] font-medium text-ink-soft">{f.kindLabel}</legend>
        <div className="flex flex-wrap gap-2">
          {CHILD_FILE_KINDS.map((kind) => (
            <label
              key={kind}
              className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-line-strong px-3 py-2 text-[14px] has-checked:border-primary has-checked:bg-tint has-checked:text-tint-ink"
            >
              <input type="radio" name="kind" value={kind} defaultChecked={(values.kind ?? "assessment") === kind} className="accent-primary" />
              {f.kind[kind]}
            </label>
          ))}
        </div>
      </fieldset>
      <label className="flex flex-col gap-1.5">
        <span className="text-[12.5px] font-medium text-ink-soft">{f.file}</span>
        <input
          type="file"
          name="file"
          accept={accept}
          required
          className="text-[13px] file:me-3 file:h-11 file:rounded-lg file:border file:border-line-strong file:bg-surface file:px-4 file:text-[14px]"
        />
        {errors.file ? <span className="text-[12px] text-danger">{i18n.error(errors.file)}</span> : <span className="text-[12px] text-ink-muted">{f.accepted}</span>}
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <InputField id={`file-title-${childId}`} name="title" label={f.title} placeholder={f.titlePlaceholder} defaultValue={values.title} error={errors.title} maxLength={200} />
        <InputField
          id={`file-date-${childId}`}
          name="formDate"
          type="date"
          label={f.formDate}
          help={f.formDateHelp}
          max={today()}
          defaultValue={values.formDate ?? today()}
          error={errors.formDate}
        />
      </div>
      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
          {pending ? f.uploading : f.upload}
        </Button>
      </div>
    </form>
  );
}
