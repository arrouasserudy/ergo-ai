"use client";

import clsx from "clsx";
import type { ReactNode } from "react";

/** An on/off setting: a label, an example line and the switch. */
export function Switch({ checked, onChange, disabled, label, description }: { checked: boolean; onChange: (checked: boolean) => void; disabled?: boolean; label: ReactNode; description?: ReactNode }) {
  return (
    <label className={clsx("flex cursor-pointer items-center justify-between gap-4", disabled && "opacity-70")}>
      <span className="min-w-0">
        <span className="block text-[14px] font-medium">{label}</span>
        {description && <span className="block text-[12.5px] text-ink-muted">{description}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={clsx("relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors", checked ? "bg-primary" : "bg-line-strong")}
      >
        <span
          className={clsx(
            "inline-block size-5 rounded-full bg-white shadow-sm transition-transform",
            checked ? "translate-x-5.5 rtl:-translate-x-5.5" : "translate-x-0.5 rtl:-translate-x-0.5",
          )}
        />
      </button>
    </label>
  );
}
