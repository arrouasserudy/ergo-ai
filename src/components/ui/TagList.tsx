import { getI18n } from "@/i18n/server";

/** Read-only chip list for display. Defaults to profile tag labels. */
export async function TagList({ values, labelOf }: { values: string[]; labelOf?: (value: string) => string }) {
  const i18n = await getI18n();
  const label = labelOf ?? i18n.tag;
  return (
    <ul className="flex flex-wrap gap-1.5">
      {values.map((v) => (
        <li key={v} className="rounded-full border border-primary/25 bg-tint px-2.5 py-1 text-[12px] text-tint-ink">
          {label(v)}
        </li>
      ))}
    </ul>
  );
}
