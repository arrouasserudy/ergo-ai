"use client";

import clsx from "clsx";
import { useState } from "react";
import { InputField } from "@/components/ui/Field";
import { GROUP_COLORS, type GroupColor } from "@/db/schema";
import { useI18n } from "@/i18n/client";
import { GROUP_COLOR_CLASSES } from "@/lib/groups/colors";
import type { FieldErrors } from "@/lib/validation";

type Values = { name?: string; place?: string | null; color?: string };

/** Name, place and color of a group (create and edit forms). */
export function GroupFields({ values, errors = {} }: { values?: Values; errors?: FieldErrors }) {
  const { t } = useI18n();
  const g = t.groups;
  const [color, setColor] = useState<GroupColor>((GROUP_COLORS as readonly string[]).includes(values?.color ?? "") ? (values!.color as GroupColor) : "teal");
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <InputField name="name" label={g.name} placeholder={g.namePlaceholder} defaultValue={values?.name ?? ""} error={errors.name} maxLength={80} autoComplete="off" required />
      <InputField name="place" label={g.place} placeholder={g.placePlaceholder} defaultValue={values?.place ?? ""} error={errors.place} maxLength={120} autoComplete="off" />
      <fieldset className="sm:col-span-2">
        <legend className="mb-1.5 text-[12.5px] font-medium text-ink-soft">{g.color}</legend>
        <input type="hidden" name="color" value={color} />
        <div className="flex flex-wrap gap-2">
          {GROUP_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              aria-pressed={color === c}
              aria-label={g.colors[c]}
              title={g.colors[c]}
              onClick={() => setColor(c)}
              className={clsx(
                "grid size-9 place-items-center rounded-full ring-offset-2 transition-shadow",
                color === c ? clsx("ring-2", GROUP_COLOR_CLASSES[c].ring) : "hover:ring-1 hover:ring-line-strong",
              )}
            >
              <span className={clsx("size-6 rounded-full", GROUP_COLOR_CLASSES[c].dot)} />
            </button>
          ))}
        </div>
      </fieldset>
    </div>
  );
}
