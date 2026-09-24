"use client";

import { CheckCircle2, Loader2, Upload } from "lucide-react";
import { useActionState } from "react";
import type { FormState } from "@/app/actions/children";
import { uploadDocument } from "@/app/actions/library";
import { Button } from "@/components/ui/Button";
import { InputField } from "@/components/ui/Field";
import { FormError } from "@/components/ui/FormError";
import { useI18n } from "@/i18n/client";

export function UploadForm() {
  const i18n = useI18n();
  const l = i18n.t.expert.library;
  const [state, action, pending] = useActionState<FormState, FormData>(uploadDocument, { ok: false });
  const errors = state.errors ?? {};
  const values = (state.values ?? {}) as Record<string, string>;

  return (
    <form action={action} className="space-y-4">
      {state.ok && state.addedName && (
        <p role="status" className="flex items-center gap-2 rounded-lg bg-ok px-3 py-2 text-[13px] text-ok-ink">
          <CheckCircle2 className="size-4" />
          {l.added(state.addedName)}
        </p>
      )}
      <FormError message={i18n.error(errors.form)} />
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className="text-[12.5px] font-medium text-ink-soft">{l.file}</span>
          <input
            type="file"
            name="file"
            accept="application/pdf,.pdf"
            required
            className="text-[13px] file:me-3 file:rounded-lg file:border file:border-line-strong file:bg-surface file:px-3 file:py-1.5 file:text-[13px]"
          />
          {errors.file && <span className="text-[12px] text-danger">{i18n.error(errors.file)}</span>}
        </label>
        <InputField name="title" label={l.docTitle} defaultValue={values.title} maxLength={200} />
      </div>
      <label className="flex items-start gap-2.5 text-[13px] text-ink-soft">
        <input type="checkbox" name="entitled" className="mt-0.5 size-4 accent-primary" />
        <span>
          {l.entitled}
          {errors.entitled && <span className="block text-[12px] text-danger">{i18n.error(errors.entitled)}</span>}
        </span>
      </label>
      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
          {pending ? l.uploading : l.upload}
        </Button>
      </div>
    </form>
  );
}
