"use client";

import clsx from "clsx";
import { Check, Plus, X } from "lucide-react";
import { useState } from "react";
import { useI18n } from "@/i18n/client";

type ChipPickerProps = {
  options: readonly string[];
  value: string[];
  onChange: (value: string[]) => void;
  /** Display label for a value; defaults to the profile tag / strategy labels. */
  labelOf?: (value: string) => string;
  allowCustom?: boolean;
  customPlaceholder?: string;
  /** Single choice: clicking a chip replaces the selection. */
  single?: boolean;
};

/** Toggleable chips. Custom values typed via "+ Autre" are appended after the options. */
export function ChipPicker({
  options,
  value,
  onChange,
  labelOf,
  allowCustom = true,
  customPlaceholder,
  single = false,
}: ChipPickerProps) {
  const i18n = useI18n();
  const { t } = i18n;
  const label = labelOf ?? i18n.tag;
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");

  const custom = value.filter((v) => !options.includes(v));
  const all = [...options, ...custom];

  const toggle = (item: string) => {
    if (single) onChange(value.includes(item) ? [] : [item]);
    else onChange(value.includes(item) ? value.filter((v) => v !== item) : [...value, item]);
  };

  const commitDraft = () => {
    const item = draft.trim();
    if (item && !value.includes(item)) onChange(single ? [item] : [...value, item]);
    setDraft("");
    setAdding(false);
  };

  return (
    <div className="flex flex-wrap gap-2">
      {all.map((item) => {
        const on = value.includes(item);
        const isCustom = !options.includes(item);
        return (
          <button
            key={item}
            type="button"
            aria-pressed={on}
            onClick={() => toggle(item)}
            className={clsx(
              "inline-flex min-h-10 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[13.5px] transition-colors",
              on ? "border-primary/40 bg-tint text-tint-ink" : "border-line-strong bg-surface text-ink-soft hover:bg-surface-muted",
            )}
          >
            {on && (isCustom ? <X className="size-3.5" aria-label={t.common.remove} /> : <Check className="size-3.5" />)}
            {label(item)}
          </button>
        );
      })}
      {allowCustom &&
        (adding ? (
          <input
            dir="auto"
            autoFocus
            value={draft}
            maxLength={60}
            placeholder={customPlaceholder ?? t.fields.customTagPlaceholder}
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
            className="h-10 w-48 rounded-full border border-primary/40 bg-surface px-3.5 text-[13.5px] focus:outline-none"
          />
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="inline-flex h-10 items-center gap-1.5 rounded-full border border-dashed border-line-strong px-3.5 text-[13.5px] text-ink-muted hover:bg-surface-muted"
          >
            <Plus className="size-3.5" />
            {t.common.other}
          </button>
        ))}
    </div>
  );
}
