import clsx from "clsx";
import type { ReactNode } from "react";
import { getI18n } from "@/i18n/server";

export type InfoItem = { label: string; value: ReactNode; wide?: boolean };

const isBlank = (v: ReactNode) => v === null || v === undefined || v === "" || (Array.isArray(v) && v.length === 0);

/** Label/value pairs; blank values render as a muted placeholder. */
export async function InfoList({ items, columns = 2 }: { items: InfoItem[]; columns?: 1 | 2 }) {
  const { t } = await getI18n();
  return (
    <dl className={clsx("grid gap-x-6 gap-y-4", columns === 2 && "sm:grid-cols-2")}>
      {items.map(({ label, value, wide }) => (
        <div key={label} className={clsx(wide && "sm:col-span-2")}>
          <dt className="text-[11.5px] font-medium text-ink-muted">{label}</dt>
          <dd dir="auto" className="mt-1 text-[14px] leading-relaxed whitespace-pre-line text-ink">
            {isBlank(value) ? <span className="text-ink-muted/70">{t.common.notProvided}</span> : value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
