"use client";

import Form from "next/form";
import type { ChangeEvent } from "react";
import { useI18n } from "@/i18n/client";

type Option = { value: string; label: string };

type Props = {
  action: string;
  tests: Option[];
  administrations: Option[];
  test: string;
  before: string | null;
  after: string;
};

const control =
  "h-10 w-full min-w-40 rounded-xl border border-line-strong bg-surface px-3 text-[14px] text-ink transition-colors focus:border-primary focus:ring-2 focus:ring-primary/15 focus:outline-none";

/** Test and Before / After pickers: a GET form kept in the URL, submitted on change. */
export function ProgressPicker({ action, tests, administrations, test, before, after }: Props) {
  const { t } = useI18n();
  const p = t.progress;
  const submit = (event: ChangeEvent<HTMLSelectElement>) => event.currentTarget.form?.requestSubmit();
  // Switching test drops the dates, which belong to the previous test.
  const switchTest = (event: ChangeEvent<HTMLSelectElement>) => {
    const form = event.currentTarget.form;
    form?.querySelectorAll<HTMLSelectElement>("select[data-date]").forEach((select) => (select.disabled = true));
    form?.requestSubmit();
  };

  return (
    <Form action={action} className="flex flex-wrap items-end gap-3">
      <label className="flex flex-col gap-1 text-[12.5px] font-medium text-ink-soft">
        {p.test}
        <select name="test" defaultValue={test} onChange={switchTest} className={control}>
          {tests.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
      {before && (
        <label className="flex flex-col gap-1 text-[12.5px] font-medium text-ink-soft">
          {p.before}
          <select name="before" data-date defaultValue={before} onChange={submit} className={control}>
            {administrations.map((o) => (
              <option key={o.value} value={o.value} disabled={o.value === after}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      )}
      {before && (
        <label className="flex flex-col gap-1 text-[12.5px] font-medium text-ink-soft">
          {p.after}
          <select name="after" data-date defaultValue={after} onChange={submit} className={control}>
            {administrations.map((o) => (
              <option key={o.value} value={o.value} disabled={o.value === before}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      )}
    </Form>
  );
}
