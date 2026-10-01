"use client";

import clsx from "clsx";
import { Archive, ArrowDown, ArrowUp, Check, Loader2, Plus, RotateCcw, Send, Undo2, X } from "lucide-react";
import { useState, useTransition, type ReactNode } from "react";
import { deleteFormTemplate, saveFormTemplate, setFormTemplateStatus } from "@/app/actions/forms";
import { Button } from "@/components/ui/Button";
import { FormError } from "@/components/ui/FormError";
import type { FormTemplateStatus } from "@/db/schema";
import { LOCALE_NAMES } from "@/i18n";
import { useI18n } from "@/i18n/client";
import { FIELD_TYPES, FORM_LANGUAGES, nextId, type FieldType, type FormField, type FormOption, type FormSchema, type FormSection } from "@/lib/forms/schema";
import { ConfirmButton } from "./ConfirmButton";
import { FormRenderer } from "./FormRenderer";

const input =
  "w-full rounded-xl border border-line-strong bg-surface px-3 text-[14px] text-ink focus:border-primary focus:ring-2 focus:ring-primary/15 focus:outline-none";

const move = <T,>(list: T[], from: number, to: number): T[] => {
  if (to < 0 || to >= list.length) return list;
  const copy = [...list];
  const [item] = copy.splice(from, 1);
  copy.splice(to, 0, item);
  return copy;
};

/** Changes a field's type, keeping what both types share (lists survive between choice types). */
function convertField(field: FormField, type: FieldType, newOption: (n: number) => string): FormField {
  const base = {
    id: field.id,
    label: field.label,
    help: field.help,
    required: type === "info" ? false : field.required,
    // Keeps identifying answers out of the AI prompts whatever the new type.
    ...(field.identifying && type !== "info" ? { identifying: true } : {}),
  };
  const options: FormOption[] =
    "options" in field ? field.options : "columns" in field ? field.columns : [1, 2].map((n) => ({ id: `o${n}`, label: newOption(n) }));
  switch (type) {
    case "single_choice":
    case "multi_choice":
      return { ...base, type, options: options.map((o, i) => ({ id: `o${i + 1}`, label: o.label })), allowOther: "allowOther" in field ? field.allowOther : false };
    case "matrix":
      return {
        ...base,
        type,
        rows: "rows" in field ? field.rows : [{ id: "r1", label: newOption(1) }],
        columns: options.slice(0, 12).map((o, i) => ({ id: `c${i + 1}`, label: o.label })),
      };
    case "scale":
      return { ...base, type, min: 1, max: 5 };
    case "number":
      return { ...base, type };
    default:
      return { ...base, type };
  }
}

type Props = { id: string; initial: FormSchema; status: FormTemplateStatus };

/** Editor of a library form (left) with a live preview (right; a tab on smaller screens). */
export function FormBuilder({ id, initial, status }: Props) {
  const { t } = useI18n();
  const f = t.forms;
  const [form, setForm] = useState(initial);
  const [dirty, setDirty] = useState(false);
  const [issues, setIssues] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"edit" | "preview">("edit");
  const [saving, startSaving] = useTransition();
  const [changing, startChanging] = useTransition();
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const update = (next: FormSchema) => {
    setForm(next);
    setDirty(true);
    setSavedAt(null);
  };
  const setSection = (si: number, section: FormSection) => update({ ...form, sections: form.sections.map((s, i) => (i === si ? section : s)) });
  const setField = (si: number, fi: number, field: FormField) =>
    setSection(si, { ...form.sections[si], fields: form.sections[si].fields.map((fl, i) => (i === fi ? field : fl)) });
  const fieldIds = () => form.sections.flatMap((s) => s.fields.map((fl) => fl.id));

  const save = () =>
    startSaving(async () => {
      const result = await saveFormTemplate(id, form);
      if (result.ok) {
        setDirty(false);
        setIssues([]);
        setError(null);
        setSavedAt(result.savedAt);
      } else {
        setIssues(result.issues ?? []);
        setError(result.error);
        setTab("edit");
      }
    });

  const changeStatus = (next: FormTemplateStatus) =>
    startChanging(async () => {
      const result = await setFormTemplateStatus(id, next);
      if (result.ok) {
        setIssues([]);
        setError(null);
      } else {
        setIssues(result.issues ?? []);
        setError(result.error);
        setTab("edit");
      }
    });
  const hasIssue = (prefix: string) => issues.some((p) => p === prefix || p.startsWith(`${prefix}.`));

  const editor = (
    <div className="space-y-5">
      <div className="space-y-3 rounded-2xl border border-line bg-surface shadow-card p-4">
        <Labeled label={f.formTitle} invalid={hasIssue("title")}>
          <input dir="auto" className={clsx(input, "h-11")} value={form.title} maxLength={200} onChange={(e) => update({ ...form, title: e.target.value })} />
        </Labeled>
        <Labeled label={f.formDescription}>
          <textarea
            dir="auto"
            rows={2}
            className={clsx(input, "py-2")}
            value={form.description ?? ""}
            onChange={(e) => update({ ...form, description: e.target.value || undefined })}
          />
        </Labeled>
        <Labeled label={f.formLanguage}>
          <select className={clsx(input, "h-11 max-w-48")} value={form.language} onChange={(e) => update({ ...form, language: e.target.value as FormSchema["language"] })}>
            {FORM_LANGUAGES.map((l) => (
              <option key={l} value={l}>
                {LOCALE_NAMES[l]}
              </option>
            ))}
          </select>
        </Labeled>
      </div>

      {form.sections.map((section, si) => (
        <div key={section.id} className="space-y-3 rounded-2xl border border-line bg-surface shadow-card p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] font-medium tracking-[0.12em] text-ink-muted uppercase">{f.section(si + 1)}</p>
            <Reorder
              onUp={si > 0 ? () => update({ ...form, sections: move(form.sections, si, si - 1) }) : undefined}
              onDown={si < form.sections.length - 1 ? () => update({ ...form, sections: move(form.sections, si, si + 1) }) : undefined}
              onRemove={form.sections.length > 1 ? () => update({ ...form, sections: form.sections.filter((_, i) => i !== si) }) : undefined}
            />
          </div>
          <input
            dir="auto"
            aria-label={f.sectionTitle}
            placeholder={f.sectionTitle}
            className={clsx(input, "h-10 font-medium")}
            value={section.title ?? ""}
            onChange={(e) => setSection(si, { ...section, title: e.target.value || undefined })}
          />
          <textarea
            dir="auto"
            aria-label={f.sectionDescription}
            placeholder={f.sectionDescription}
            rows={1}
            className={clsx(input, "py-2 text-[13px]")}
            value={section.description ?? ""}
            onChange={(e) => setSection(si, { ...section, description: e.target.value || undefined })}
          />

          <ol className="space-y-3">
            {section.fields.map((field, fi) => (
              <li key={field.id}>
                <FieldEditor
                  field={field}
                  invalid={hasIssue(`sections.${si}.fields.${fi}`)}
                  onChange={(next) => setField(si, fi, next)}
                  onUp={fi > 0 ? () => setSection(si, { ...section, fields: move(section.fields, fi, fi - 1) }) : undefined}
                  onDown={fi < section.fields.length - 1 ? () => setSection(si, { ...section, fields: move(section.fields, fi, fi + 1) }) : undefined}
                  onRemove={() => setSection(si, { ...section, fields: section.fields.filter((_, i) => i !== fi) })}
                />
              </li>
            ))}
          </ol>
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              setSection(si, { ...section, fields: [...section.fields, { id: nextId("f", fieldIds()), type: "text", label: f.newField, required: false }] })
            }
          >
            <Plus className="size-3.5" />
            {f.addField}
          </Button>
        </div>
      ))}

      <Button
        variant="secondary"
        onClick={() =>
          update({
            ...form,
            sections: [
              ...form.sections,
              { id: nextId("s", form.sections.map((s) => s.id)), fields: [{ id: nextId("f", fieldIds()), type: "text", label: f.newField, required: false }] },
            ],
          })
        }
      >
        <Plus className="size-4" />
        {f.addSection}
      </Button>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="sticky top-0 z-10 -mx-1 flex flex-wrap items-center gap-2 bg-canvas/95 px-1 py-2 backdrop-blur">
        <Button onClick={save} disabled={saving || !dirty}>
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
          {saving ? f.saving : f.save}
        </Button>
        {status === "draft" && (
          <Button variant="secondary" disabled={dirty || changing} onClick={() => changeStatus("published")}>
            <Send className="size-4 rtl:-scale-x-100" />
            {f.publish}
          </Button>
        )}
        {status === "published" && (
          <Button variant="secondary" disabled={changing} onClick={() => changeStatus("draft")}>
            <Undo2 className="size-4" />
            {f.unpublish}
          </Button>
        )}
        {status === "archived" ? (
          <Button variant="secondary" disabled={changing} onClick={() => changeStatus("draft")}>
            <RotateCcw className="size-4" />
            {f.restore}
          </Button>
        ) : (
          <Button variant="ghost" disabled={changing} onClick={() => changeStatus("archived")}>
            <Archive className="size-4" />
            {f.archive}
          </Button>
        )}
        <span className="text-[12px] text-ink-muted" role="status">
          {dirty ? f.unsaved : savedAt ? f.saved : ""}
        </span>
        <span className="ms-auto">
          <ConfirmButton label={f.deleteForm} question={f.deleteConfirm} onConfirm={() => deleteFormTemplate(id)} />
        </span>
      </div>

      <FormError message={error ? (f.errors[error] ?? f.errors.generic) : undefined} />

      <div className="flex gap-1 rounded-lg bg-surface-muted p-1 lg:hidden" role="tablist">
        {(["edit", "preview"] as const).map((key) => (
          <button
            key={key}
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={clsx("h-9 flex-1 rounded-md text-[13px] font-medium", tab === key ? "bg-surface shadow-sm" : "text-ink-muted")}
          >
            {key === "edit" ? f.editTab : f.previewTab}
          </button>
        ))}
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-2">
        <div className={clsx(tab !== "edit" && "hidden lg:block")}>{editor}</div>
        <div className={clsx("rounded-2xl border border-line bg-surface shadow-card p-5 lg:sticky lg:top-16 lg:max-h-[calc(100dvh-5rem)] lg:overflow-y-auto", tab !== "preview" && "hidden lg:block")}>
          <p className="mb-4 text-[11px] font-medium tracking-[0.12em] text-ink-muted uppercase">{f.previewTab}</p>
          <PreviewPane form={form} />
        </div>
      </div>
    </div>
  );
}

/** The preview keeps its own answers so the therapist can try the form. */
function PreviewPane({ form }: { form: FormSchema }) {
  const [answers, setAnswers] = useState({});
  return (
    <FormRenderer
      form={form}
      answers={answers}
      idPrefix="preview"
      onChange={(fieldId, answer) =>
        setAnswers((prev: Record<string, unknown>) => {
          const next = { ...prev };
          if (answer === undefined) delete next[fieldId];
          else next[fieldId] = answer;
          return next;
        })
      }
    />
  );
}

function Labeled({ label, invalid, children }: { label: string; invalid?: boolean; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className={clsx("text-[12px] font-medium", invalid ? "text-danger" : "text-ink-soft")}>{label}</span>
      {children}
    </label>
  );
}

function Reorder({ onUp, onDown, onRemove }: { onUp?: () => void; onDown?: () => void; onRemove?: () => void }) {
  const { t } = useI18n();
  const icon = "grid size-9 place-items-center rounded-lg text-ink-muted hover:bg-surface-muted hover:text-ink disabled:opacity-30 disabled:hover:bg-transparent";
  return (
    <div className="flex shrink-0">
      <button type="button" className={icon} onClick={onUp} disabled={!onUp} aria-label={t.forms.moveUp} title={t.forms.moveUp}>
        <ArrowUp className="size-4" />
      </button>
      <button type="button" className={icon} onClick={onDown} disabled={!onDown} aria-label={t.forms.moveDown} title={t.forms.moveDown}>
        <ArrowDown className="size-4" />
      </button>
      <button type="button" className={icon} onClick={onRemove} disabled={!onRemove} aria-label={t.forms.remove} title={t.forms.remove}>
        <X className="size-4" />
      </button>
    </div>
  );
}

type FieldEditorProps = {
  field: FormField;
  invalid: boolean;
  onChange: (field: FormField) => void;
  onUp?: () => void;
  onDown?: () => void;
  onRemove: () => void;
};

function FieldEditor({ field, invalid, onChange, onUp, onDown, onRemove }: FieldEditorProps) {
  const { t } = useI18n();
  const f = t.forms;

  return (
    <div className={clsx("space-y-2.5 rounded-xl border p-3", invalid ? "border-danger" : "border-line")}>
      <div className="flex items-start gap-2">
        <textarea
          dir="auto"
          rows={1}
          aria-label={field.type === "info" ? f.infoLabel : f.fieldLabel}
          className={clsx(input, "field-sizing-content min-h-10 flex-1 resize-none py-2")}
          value={field.label}
          onChange={(e) => onChange({ ...field, label: e.target.value })}
        />
        <Reorder onUp={onUp} onDown={onDown} onRemove={onRemove} />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <select
          aria-label={f.fieldType}
          className={clsx(input, "h-10 w-auto")}
          value={field.type}
          onChange={(e) => onChange(convertField(field, e.target.value as FieldType, f.newOption))}
        >
          {FIELD_TYPES.map((type) => (
            <option key={type} value={type}>
              {f.fieldTypes[type]}
            </option>
          ))}
        </select>
        {field.type !== "info" && (
          <label className="flex items-center gap-2 text-[13px] text-ink-soft">
            <input type="checkbox" className="size-4 accent-primary" checked={field.required} onChange={(e) => onChange({ ...field, required: e.target.checked })} />
            {f.required}
          </label>
        )}
        {field.type !== "info" && (
          <label className="flex items-center gap-2 text-[13px] text-ink-soft" title={f.identifyingHint}>
            <input
              type="checkbox"
              className="size-4 accent-primary"
              checked={field.identifying ?? false}
              onChange={(e) => onChange({ ...field, identifying: e.target.checked || undefined })}
            />
            {f.identifying}
          </label>
        )}
      </div>
      {field.type !== "info" && (
        <input
          dir="auto"
          aria-label={f.fieldHelp}
          placeholder={f.fieldHelp}
          className={clsx(input, "h-9 text-[13px]")}
          value={field.help ?? ""}
          onChange={(e) => onChange({ ...field, help: e.target.value || undefined })}
        />
      )}

      {field.type === "number" && (
        <input
          dir="auto"
          aria-label={f.unit}
          placeholder={f.unit}
          maxLength={40}
          className={clsx(input, "h-9 max-w-40 text-[13px]")}
          value={field.unit ?? ""}
          onChange={(e) => onChange({ ...field, unit: e.target.value || undefined })}
        />
      )}

      {(field.type === "single_choice" || field.type === "multi_choice") && (
        <>
          <OptionsEditor label={f.options} prefix="o" options={field.options} onChange={(options) => onChange({ ...field, options })} />
          <label className="flex items-center gap-2 text-[13px] text-ink-soft">
            <input type="checkbox" className="size-4 accent-primary" checked={field.allowOther} onChange={(e) => onChange({ ...field, allowOther: e.target.checked })} />
            {f.allowOther}
          </label>
        </>
      )}

      {field.type === "matrix" && (
        <div className="grid gap-3 sm:grid-cols-2">
          <OptionsEditor label={f.rows} prefix="r" options={field.rows} onChange={(rows) => onChange({ ...field, rows })} />
          <OptionsEditor label={f.columns} prefix="c" max={12} options={field.columns} onChange={(columns) => onChange({ ...field, columns })} />
        </div>
      )}

      {field.type === "scale" && (
        <div className="grid grid-cols-2 gap-2 text-[13px]">
          <Labeled label={f.scaleMin}>
            <select className={clsx(input, "h-9")} value={field.min} onChange={(e) => onChange({ ...field, min: Number(e.target.value) })}>
              {[0, 1].map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
          </Labeled>
          <Labeled label={f.scaleMax}>
            <select className={clsx(input, "h-9")} value={field.max} onChange={(e) => onChange({ ...field, max: Number(e.target.value) })}>
              {[2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
          </Labeled>
          <input
            dir="auto"
            aria-label={f.minLabel}
            placeholder={f.minLabel}
            className={clsx(input, "h-9")}
            value={field.minLabel ?? ""}
            onChange={(e) => onChange({ ...field, minLabel: e.target.value || undefined })}
          />
          <input
            dir="auto"
            aria-label={f.maxLabel}
            placeholder={f.maxLabel}
            className={clsx(input, "h-9")}
            value={field.maxLabel ?? ""}
            onChange={(e) => onChange({ ...field, maxLabel: e.target.value || undefined })}
          />
        </div>
      )}
    </div>
  );
}

function OptionsEditor({
  label,
  prefix,
  options,
  max = 60,
  onChange,
}: {
  label: string;
  prefix: string;
  options: FormOption[];
  max?: number;
  onChange: (options: FormOption[]) => void;
}) {
  const { t } = useI18n();
  const f = t.forms;
  return (
    <fieldset className="space-y-1.5">
      <legend className="mb-1 text-[12px] font-medium text-ink-soft">{label}</legend>
      {options.map((option, i) => (
        <div key={option.id} className="flex items-center gap-1">
          <input
            dir="auto"
            aria-label={`${label} ${i + 1}`}
            className={clsx(input, "h-9 flex-1 text-[13px]")}
            value={option.label}
            onChange={(e) => onChange(options.map((o) => (o.id === option.id ? { ...o, label: e.target.value } : o)))}
          />
          <button
            type="button"
            aria-label={f.remove}
            title={f.remove}
            disabled={options.length <= 1}
            onClick={() => onChange(options.filter((o) => o.id !== option.id))}
            className="grid size-9 place-items-center rounded-lg text-ink-muted hover:bg-surface-muted hover:text-ink disabled:opacity-30"
          >
            <X className="size-3.5" />
          </button>
        </div>
      ))}
      {options.length < max && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onChange([...options, { id: nextId(prefix, options.map((o) => o.id)), label: f.newOption(options.length + 1) }])}
        >
          <Plus className="size-3.5" />
          {f.addOption}
        </Button>
      )}
    </fieldset>
  );
}
