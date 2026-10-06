import clsx from "clsx";
import { Badge } from "@/components/ui/Badge";
import type { I18n } from "@/i18n";
import type { UsageRow } from "@/lib/analytics/summary";

type Row = UsageRow & { source?: "server" | "client" };

/** Rows of the usage page: name, a bar relative to the most used, then the figures. Zeros are dimmed. */
export function UsageRows({ rows, i18n }: { rows: Row[]; i18n: I18n }) {
  const u = i18n.t.usage;
  return (
    <ul className="@container divide-y divide-line">
      <li aria-hidden className="hidden grid-cols-[minmax(0,1fr)_4.5rem_3.5rem_3.5rem_7rem] gap-3 px-5 pb-2 text-[11.5px] font-medium text-ink-muted @xl:grid">
        <span>{u.columns.name}</span>
        <span className="text-end">{u.columns.uses}</span>
        <span className="text-end">{u.columns.therapists}</span>
        <span className="text-end">{u.columns.cabinets}</span>
        <span className="text-end">{u.columns.last}</span>
      </li>
      {rows.map((row) => (
        <li
          key={`${row.kind}:${row.name}`}
          className={clsx("grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 px-5 py-2.5 @xl:grid-cols-[minmax(0,1fr)_4.5rem_3.5rem_3.5rem_7rem]", row.uses === 0 && "text-ink-muted")}
        >
          <span className="min-w-0">
            <span className="flex min-w-0 items-center gap-2">
              <code dir="ltr" className="truncate text-[13px]">
                {row.name}
              </code>
              {row.source && <Badge tone={row.source === "client" ? "muted" : "tint"}>{u.source[row.source]}</Badge>}
            </span>
            <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-surface-muted">
              <span className="block h-full rounded-full bg-primary" style={{ width: `${Math.round(row.share * 100)}%` }} />
            </span>
          </span>
          <span className="text-end text-[15px] font-semibold tabular-nums">{row.uses}</span>
          <span className="col-span-2 flex gap-3 text-[12px] text-ink-muted @xl:contents">
            <span className="tabular-nums @xl:text-end @xl:text-[13px]">
              <span className="@xl:hidden">{u.columns.therapists} </span>
              {row.therapists}
            </span>
            <span className="tabular-nums @xl:text-end @xl:text-[13px]">
              <span className="@xl:hidden">{u.columns.cabinets} </span>
              {row.cabinets}
            </span>
            <span className="ms-auto @xl:ms-0 @xl:text-end @xl:text-[13px]">{row.lastAt ? i18n.dateTime(row.lastAt) : u.never}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
