"use client";

import { useState } from "react";
import { ChipPicker } from "./ChipPicker";

type TagPickerProps = {
  name: string;
  label: string;
  options: readonly string[];
  defaultValue?: string[];
  allowCustom?: boolean;
};

/** Form field version of ChipPicker: the selection is posted through hidden inputs. */
export function TagPicker({ name, label, options, defaultValue = [], allowCustom = true }: TagPickerProps) {
  const [selected, setSelected] = useState<string[]>(defaultValue);

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 text-[12.5px] font-medium text-ink-soft">{label}</legend>
      {selected.map((v) => (
        <input key={v} type="hidden" name={name} value={v} />
      ))}
      <ChipPicker options={options} value={selected} onChange={setSelected} allowCustom={allowCustom} />
    </fieldset>
  );
}
