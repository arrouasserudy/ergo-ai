/**
 * Pure shaping of the usage counts for the admin page: every catalog event and every page
 * gets a row, so what was never used shows with a zero instead of being missing.
 */
import { EVENTS, type EventName } from "./events";
import { APP_ROUTES } from "./routes";

/** One aggregated (kind, name) of the period, as the query returns it. */
export type UsageCount = { kind: "page" | "event"; name: string; uses: number; therapists: number; cabinets: number; lastAt: Date | null };

export type UsageRow = UsageCount & { share: number };
export type AreaUsage = { area: string; uses: number; rows: (UsageRow & { source: "server" | "client" })[] };

export type UsageSummary = {
  areas: AreaUsage[];
  pages: UsageRow[];
  unusedEvents: EventName[];
  unusedPages: string[];
  /** Names in the data but no longer in the catalog (renamed or removed). */
  retired: UsageCount[];
};

const empty = (kind: UsageCount["kind"], name: string): UsageCount => ({ kind, name, uses: 0, therapists: 0, cabinets: 0, lastAt: null });

/** Most used first; ties (zeros included) by name, so the order is stable. */
const byUses = (a: UsageCount, b: UsageCount) => b.uses - a.uses || a.name.localeCompare(b.name);

export function summarizeUsage(counts: UsageCount[]): UsageSummary {
  const found = new Map(counts.map((c) => [`${c.kind}:${c.name}`, c]));
  const get = (kind: UsageCount["kind"], name: string) => found.get(`${kind}:${name}`) ?? empty(kind, name);

  const eventNames = Object.keys(EVENTS) as EventName[];
  const events = eventNames.map((name) => ({ ...get("event", name), source: EVENTS[name].source }));
  const maxEvent = Math.max(1, ...events.map((e) => e.uses));
  const areas = new Map<string, AreaUsage>();
  for (const event of events.sort(byUses)) {
    const area = EVENTS[event.name as EventName].area;
    const entry = areas.get(area) ?? { area, uses: 0, rows: [] };
    entry.uses += event.uses;
    entry.rows.push({ ...event, share: event.uses / maxEvent });
    areas.set(area, entry);
  }

  const pageRows = APP_ROUTES.map((route) => get("page", route)).sort(byUses);
  const maxPage = Math.max(1, ...pageRows.map((p) => p.uses));

  const known = new Set([...eventNames.map((n) => `event:${n}`), ...APP_ROUTES.map((r) => `page:${r}`)]);
  return {
    areas: [...areas.values()].sort((a, b) => b.uses - a.uses || a.area.localeCompare(b.area)),
    pages: pageRows.map((p) => ({ ...p, share: p.uses / maxPage })),
    unusedEvents: eventNames.filter((name) => get("event", name).uses === 0).sort(),
    unusedPages: APP_ROUTES.filter((route) => get("page", route).uses === 0),
    retired: counts.filter((c) => !known.has(`${c.kind}:${c.name}`)).sort(byUses),
  };
}

export const USAGE_PERIODS = [7, 30, 90, 365] as const;
export type UsagePeriod = (typeof USAGE_PERIODS)[number];

export function parsePeriod(value: unknown): UsagePeriod {
  const n = Number(value);
  return (USAGE_PERIODS as readonly number[]).includes(n) ? (n as UsagePeriod) : 30;
}
