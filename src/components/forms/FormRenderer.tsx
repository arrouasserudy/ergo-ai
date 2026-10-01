"use client";

import clsx from "clsx";
import { useMemo } from "react";
import { answerText } from "@/lib/forms/answers";
import { OTHER, type Answer, type Answers, type ChoiceAnswer, type FormField, type FormSchema, type MatrixAnswer } from "@/lib/forms/schema";
import { createI18n } from "@/i18n";
import type { Dictionary } from "@/i18n/fr";

type Mode = "fill" | "readonly" | "print";

type FormRendererProps = {
  form: FormSchema;
  answers: Answers;
  onChange?: (fieldId: string, answer: Answer | undefined) => void;
  mode?: Mode;
  /** Ids of required fields left empty, highlighted after a failed submit. */
  missing?: string[];
  /** Keeps element ids unique when two renderers share a page. */
  idPrefix?: string;
  /** Hides the title block (shown by the page itself). */
  hideTitle?: boolean;
};

const control =
  "w-full rounded-xl border bg-surface px-3 text-[15px] text-ink transition-colors focus:border-primary focus:ring-2 focus:ring-primary/15 focus:outline-none";
const choice =
  "flex min-h-11 cursor-pointer items-center gap-2.5 rounded-xl border border-line-strong px-3 py-2 text-[14px] has-checked:border-primary has-checked:bg-tint has-checked:text-tint-ink";

/**
 * Renders a form in the app's convention: to fill in, read-only, or for printing.
 * The form's own language sets the text direction.
 */
export function FormRenderer({ form, answers, onChange, mode = "fill", missing = [], idPrefix = "form", hideTitle = false }: FormRendererProps) {
  // The words the form itself shows (yes/no, other…) are in the form's language, not the app's.
  const t = useMemo(() => createI18n(form.language, "UTC").t, [form.language]);
  const dir = form.language === "he" ? "rtl" : "ltr";
  const print = mode === "print";
  const hasRequired = mode === "fill" && form.sections.some((s) => s.fields.some((f) => f.required));

  return (
    <div dir={dir} lang={form.language} className={clsx(print ? "space-y-5" : "space-y-8")}>
      {!hideTitle && (
        <header>
          <h2 className={clsx("leading-tight font-semibold tracking-tight", print ? "text-[16pt]" : "text-[24px]")}>{form.title}</h2>
          {form.description && <p className="mt-2 text-[13.5px] whitespace-pre-line text-ink-soft">{form.description}</p>}
        </header>
      )}
      {hasRequired && <p className="text-[12px] text-ink-muted">{t.forms.requiredNote}</p>}

      {form.sections.map((section) => (
        <section key={section.id} className={clsx(print ? "space-y-3 break-inside-avoid-page" : "space-y-5")}>
          {(section.title || section.description) && (
            <header className={clsx(!print && "border-b border-line pb-2")}>
              {section.title && <h3 className={clsx("font-semibold tracking-tight", print ? "text-[13pt]" : "text-[17px]")}>{section.title}</h3>}
              {section.description && <p className="mt-1 text-[13px] whitespace-pre-line text-ink-soft">{section.description}</p>}
            </header>
          )}
          {section.fields.map((field) => (
            <FieldView
              key={field.id}
              field={field}
              answer={answers[field.id]}
              mode={mode}
              invalid={missing.includes(field.id)}
              htmlId={`${idPrefix}-${field.id}`}
              t={t}
              onChange={(value) => onChange?.(field.id, value)}
            />
          ))}
        </section>
      ))}
    </div>
  );
}

type FieldViewProps = {
  field: FormField;
  answer: Answer | undefined;
  mode: Mode;
  invalid: boolean;
  htmlId: string;
  t: Dictionary;
  onChange: (answer: Answer | undefined) => void;
};

function FieldView({ field, answer, mode, invalid, htmlId, t, onChange }: FieldViewProps) {

  if (field.type === "info") {
    return <p className="text-[13.5px] whitespace-pre-line text-ink-soft">{field.label}</p>;
  }

  const labels = { yes: t.common.yes, no: t.common.no, other: t.common.other };
  const label = (
    <span className="block text-[14px] font-medium text-ink">
      {field.label}
      {field.required && mode === "fill" && <span className="ms-0.5 text-warn-ink">*</span>}
    </span>
  );
  const help = field.help && <span className="mt-0.5 block text-[12.5px] whitespace-pre-line text-ink-muted">{field.help}</span>;
  const error = invalid && <p className="text-[12px] text-danger">{t.errors.required}</p>;

  if (mode !== "fill") {
    return (
      <div className={clsx(mode === "print" ? "break-inside-avoid" : "space-y-1")}>
        {label}
        {mode === "readonly" && help}
        {field.type === "matrix" ? (
          <MatrixReadonly field={field} answer={answer as MatrixAnswer | undefined} />
        ) : (
          <p className={clsx("text-[14px] whitespace-pre-line", answer === undefined ? "text-ink-muted" : "text-ink-soft")} dir="auto">
            {answer === undefined ? "—" : answerText(field, answer, labels)}
          </p>
        )}
      </div>
    );
  }

  const set = (value: Answer | undefined) => onChange(value);

  switch (field.type) {
    case "text":
    case "number":
    case "date":
      return (
        <div className="space-y-1.5">
          <label htmlFor={htmlId}>
            {label}
            {help}
          </label>
          <div className="flex items-center gap-2">
            <input
              id={htmlId}
              dir="auto"
              type={field.type === "text" ? "text" : field.type}
              inputMode={field.type === "number" ? "decimal" : undefined}
              value={answer === undefined ? "" : String(answer)}
              aria-invalid={invalid || undefined}
              onChange={(e) => {
                const raw = e.target.value;
                if (field.type === "number") set(raw === "" || Number.isNaN(Number(raw)) ? undefined : Number(raw));
                else set(raw === "" ? undefined : raw);
              }}
              className={clsx(control, "h-11", field.type !== "text" && "max-w-60", invalid ? "border-danger" : "border-line-strong")}
            />
            {field.type === "number" && field.unit && <span className="text-[13px] text-ink-muted">{field.unit}</span>}
          </div>
          {error}
        </div>
      );
    case "textarea":
      return (
        <div className="space-y-1.5">
          <label htmlFor={htmlId}>
            {label}
            {help}
          </label>
          <textarea
            id={htmlId}
            dir="auto"
            rows={3}
            value={typeof answer === "string" ? answer : ""}
            aria-invalid={invalid || undefined}
            onChange={(e) => set(e.target.value === "" ? undefined : e.target.value)}
            className={clsx(control, "resize-y py-2.5 leading-relaxed", invalid ? "border-danger" : "border-line-strong")}
          />
          {error}
        </div>
      );
    case "yes_no":
      return (
        <fieldset className="space-y-1.5">
          <legend className="mb-1.5">
            {label}
            {help}
          </legend>
          <div className="flex gap-2">
            {[true, false].map((value) => (
              <label key={String(value)} className={clsx(choice, "min-w-24")}>
                <input type="radio" name={htmlId} checked={answer === value} onChange={() => set(value)} className="accent-primary" />
                {value ? t.common.yes : t.common.no}
              </label>
            ))}
          </div>
          {error}
        </fieldset>
      );
    case "single_choice":
    case "multi_choice": {
      const current = (answer as ChoiceAnswer | undefined) ?? { selected: [] };
      const single = field.type === "single_choice";
      const toggle = (id: string) => {
        const on = current.selected.includes(id);
        const selected = single ? [id] : on ? current.selected.filter((s) => s !== id) : [...current.selected, id];
        set(selected.length ? { selected, other: selected.includes(OTHER) ? current.other : undefined } : undefined);
      };
      const options = [...field.options, ...(field.allowOther ? [{ id: OTHER, label: t.common.other }] : [])];
      return (
        <fieldset className="space-y-1.5">
          <legend className="mb-1.5">
            {label}
            {help}
          </legend>
          <div className={clsx("grid gap-2", options.length > 3 && "sm:grid-cols-2")}>
            {options.map((option) => (
              <label key={option.id} className={choice}>
                <input
                  type={single ? "radio" : "checkbox"}
                  name={htmlId}
                  checked={current.selected.includes(option.id)}
                  onChange={() => toggle(option.id)}
                  className="size-4 shrink-0 accent-primary"
                />
                {option.label}
              </label>
            ))}
          </div>
          {current.selected.includes(OTHER) && (
            <input
              dir="auto"
              aria-label={t.common.other}
              placeholder={t.forms.otherPlaceholder}
              value={current.other ?? ""}
              onChange={(e) => set({ selected: current.selected, other: e.target.value })}
              className={clsx(control, "h-11 border-line-strong")}
            />
          )}
          {error}
        </fieldset>
      );
    }
    case "scale": {
      const values = Array.from({ length: field.max - field.min + 1 }, (_, i) => field.min + i);
      return (
        <fieldset className="space-y-1.5">
          <legend className="mb-1.5">
            {label}
            {help}
          </legend>
          <div className="flex flex-wrap gap-2">
            {values.map((value) => (
              <label key={value} className={clsx(choice, "min-w-11 justify-center px-0")}>
                <input type="radio" name={htmlId} checked={answer === value} onChange={() => set(value)} className="sr-only" />
                {value}
              </label>
            ))}
          </div>
          {(field.minLabel || field.maxLabel) && (
            <div className="flex justify-between gap-4 text-[12px] text-ink-muted">
              <span>
                {field.min} = {field.minLabel ?? ""}
              </span>
              <span>
                {field.max} = {field.maxLabel ?? ""}
              </span>
            </div>
          )}
          {error}
        </fieldset>
      );
    }
    case "matrix": {
      const current = (answer as MatrixAnswer | undefined) ?? {};
      const pick = (row: string, col: string) => set({ ...current, [row]: col });
      return (
        <fieldset className="space-y-2">
          <legend className="mb-1.5">
            {label}
            {help}
          </legend>
          {/* Phones: one group per row. */}
          <div className="space-y-3 md:hidden">
            {field.rows.map((row) => (
              <div key={row.id} className="rounded-xl border border-line p-3">
                <p className="mb-2 text-[13.5px]">{row.label}</p>
                <div className="flex flex-wrap gap-2">
                  {field.columns.map((col) => (
                    <label key={col.id} className={clsx(choice, "min-h-10 text-[13px]")}>
                      <input
                        type="radio"
                        name={`${htmlId}-${row.id}-m`}
                        checked={current[row.id] === col.id}
                        onChange={() => pick(row.id, col.id)}
                        className="accent-primary"
                      />
                      {col.label}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
          {/* Larger screens: a grid. */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full border-collapse text-[13.5px]">
              <thead>
                <tr className="border-b border-line">
                  <th />
                  {field.columns.map((col) => (
                    <th key={col.id} scope="col" className="px-2 py-2 text-center text-[12px] font-medium text-ink-muted">
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {field.rows.map((row) => (
                  <tr key={row.id} className={clsx(invalid && current[row.id] === undefined && "bg-warn/40")}>
                    <th scope="row" className="py-2 pe-3 text-start font-normal">
                      {row.label}
                    </th>
                    {field.columns.map((col) => (
                      <td key={col.id} className="px-2 text-center">
                        <input
                          type="radio"
                          name={`${htmlId}-${row.id}-t`}
                          aria-label={`${row.label}: ${col.label}`}
                          checked={current[row.id] === col.id}
                          onChange={() => pick(row.id, col.id)}
                          className="size-5 accent-primary"
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {error}
        </fieldset>
      );
    }
  }
}

function MatrixReadonly({ field, answer }: { field: Extract<FormField, { type: "matrix" }>; answer: MatrixAnswer | undefined }) {
  return (
    <table className="mt-1 w-full border-collapse text-[13px]">
      <tbody>
        {field.rows.map((row) => (
          <tr key={row.id} className="border-b border-line last:border-0">
            <th scope="row" className="py-1 pe-3 text-start font-normal text-ink-soft">
              {row.label}
            </th>
            <td className="py-1 text-end">{field.columns.find((c) => c.id === answer?.[row.id])?.label ?? "—"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
