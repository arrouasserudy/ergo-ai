"use client";

import clsx from "clsx";
import { Check, Plus, X } from "lucide-react";
import { useState } from "react";
import { t, tagLabel } from "@/i18n/fr";

type TagPickerProps = {
  name: string;
  label: string;
  options: readonly string[];
  defaultValue?: string[];
  allowCustom?: boolean;
};

/**
 * Toggleable chips backed by hidden inputs, so the selection is posted with the form.
 * Custom values typed via "+ Autre" are appended after the presets.
 */
export function TagPicker({ name, label, options, defaultValue = [], allowCustom = true }: TagPickerProps) {
  const [selected, setSelected] = useState<string[]>(defaultValue);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");

  const custom = selected.filter((v) => !options.includes(v));
  const all = [...options, ...custom];

  const toggle = (value: string) =>
    setSelected((cur) => (cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value]));

  const commitDraft = () => {
    const value = draft.trim();
    if (value && !selected.includes(value)) setSelected((cur) => [...cur, value]);
    setDraft("");
    setAdding(false);
  };

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 text-[12.5px] font-medium text-ink-soft">{label}</legend>
      {selected.map((v) => (
        <input key={v} type="hidden" name={name} value={v} />
      ))}
      <div className="flex flex-wrap gap-1.5">
        {all.map((value) => {
          const on = selected.includes(value);
          const isCustom = !options.includes(value);
          return (
            <button
              key={value}
              type="button"
              aria-pressed={on}
              onClick={() => toggle(value)}
              className={clsx(
                "inline-flex h-8 items-center gap-1 rounded-full border px-3 text-[12.5px] transition-colors",
                on ? "border-primary/40 bg-tint text-tint-ink" : "border-line-strong bg-surface text-ink-soft hover:bg-surface-muted",
              )}
            >
              {on && (isCustom ? <X className="size-3" aria-label={t.common.remove} /> : <Check className="size-3" />)}
              {tagLabel(value)}
            </button>
          );
        })}
        {allowCustom &&
          (adding ? (
            <input
              autoFocus
              value={draft}
              maxLength={60}
              placeholder={t.fields.customTagPlaceholder}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commitDraft}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  commitDraft();
                } else if (e.key === "Escape") {
                  setDraft("");
                  setAdding(false);
                }
              }}
              className="h-8 w-40 rounded-full border border-primary/40 bg-surface px-3 text-[12.5px] focus:outline-none"
            />
          ) : (
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="inline-flex h-8 items-center gap-1 rounded-full border border-dashed border-line-strong px-3 text-[12.5px] text-ink-muted hover:bg-surface-muted"
            >
              <Plus className="size-3" />
              {t.common.other}
            </button>
          ))}
      </div>
    </fieldset>
  );
}

/** Read-only chip list for display. */
export function TagList({ values }: { values: string[] }) {
  return (
    <ul className="flex flex-wrap gap-1.5">
      {values.map((v) => (
        <li key={v} className="rounded-full border border-primary/25 bg-tint px-2.5 py-1 text-[12px] text-tint-ink">
          {tagLabel(v)}
        </li>
      ))}
    </ul>
  );
}
