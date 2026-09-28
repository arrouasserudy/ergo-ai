"use client";

import { Loader2, Upload } from "lucide-react";
import { useActionState } from "react";
import type { FormState } from "@/app/actions/children";
import { uploadFormTemplate } from "@/app/actions/forms";
import { Button } from "@/components/ui/Button";
import { FormError } from "@/components/ui/FormError";
import { PrivacyBadge } from "@/components/ui/PrivacyBadge";
import { useI18n } from "@/i18n/client";

export function FormUpload() {
  const { t } = useI18n();
  const f = t.forms;
  const [state, action, pending] = useActionState<FormState, FormData>(uploadFormTemplate, { ok: false });
  const errors = state.errors ?? {};
  const message = (code: string | undefined) => (code ? (f.errors[code] ?? f.errors.generic) : undefined);

  return (
    <form action={action} className="space-y-4">
      <FormError message={message(errors.form)} />
      <label className="flex flex-col gap-1.5">
        <span className="text-[12.5px] font-medium text-ink-soft">{f.file}</span>
        <input
          type="file"
          name="file"
          accept="application/pdf,.pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.docx"
          required
          className="text-[13px] file:me-3 file:h-11 file:rounded-lg file:border file:border-line-strong file:bg-surface file:px-4 file:text-[14px]"
        />
        {errors.file && <span className="text-[12px] text-danger">{message(errors.file)}</span>}
      </label>
      <label className="flex items-start gap-2.5 text-[13px] text-ink-soft">
        <input type="checkbox" name="blank" className="mt-0.5 size-5 shrink-0 accent-primary" />
        <span>
          {f.blank}
          {errors.blank && <span className="block text-[12px] text-danger">{message(errors.blank)}</span>}
        </span>
      </label>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-[12px] text-ink-muted">
          <PrivacyBadge />
          {f.uploadHint}
        </p>
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
          {pending ? f.uploading : f.upload}
        </Button>
      </div>
    </form>
  );
}
