/**
 * The catalog of tracked features (admin page /admin/usage). Only names listed here are
 * stored, so the page can also show what was never used. `server`: recorded by a server
 * action or route with `track()` (lib/analytics/track.ts); `client`: a click on an element
 * carrying `data-track="<name>"` (components/analytics/UsageTracker.tsx). A test checks
 * that every name is used in the code and every name used is listed.
 */
export const EVENTS = {
  // Children and groups
  "child.created": { area: "children", source: "server" },
  "child.archived": { area: "children", source: "server" },
  "child.group_filter": { area: "children", source: "client" },
  "group.created": { area: "groups", source: "server" },
  "group.members_set": { area: "groups", source: "server" },
  "child_event.saved": { area: "calendar", source: "server" },

  // Crises
  "episode.started": { area: "crises", source: "server" },
  "episode.finished": { area: "crises", source: "server" },

  // Reports
  "report.created": { area: "reports", source: "server" },
  "report.dictated": { area: "reports", source: "server" },
  "report.generated": { area: "reports", source: "server" },
  "report.insight_validated": { area: "reports", source: "server" },
  "report.insight_dismissed": { area: "reports", source: "server" },
  "report.rewritten": { area: "reports", source: "server" },
  "report.validated": { area: "reports", source: "server" },
  "report.export_pdf": { area: "reports", source: "client" },
  "report.export_word": { area: "reports", source: "client" },
  "report.export_copy": { area: "reports", source: "client" },

  // Forms
  "form.uploaded": { area: "forms", source: "server" },
  "form.published": { area: "forms", source: "server" },
  "form.automated": { area: "forms", source: "server" },
  "child_form.attached": { area: "forms", source: "server" },
  "child_form.submitted": { area: "forms", source: "server" },
  "child_form.link_created": { area: "forms", source: "server" },
  "child_form.parent_submitted": { area: "forms", source: "server" },

  // OT tests
  "assessment.started": { area: "assessments", source: "server" },
  "assessment.completed": { area: "assessments", source: "server" },
  "assessment.link_created": { area: "assessments", source: "server" },
  "assessment.parent_submitted": { area: "assessments", source: "server" },

  // Amit and the library
  "amit.opened": { area: "amit", source: "client" },
  "amit.asked_from_episode": { area: "amit", source: "client" },
  "amit.asked_about_child": { area: "amit", source: "client" },
  "amit.question": { area: "amit", source: "server" },
  "library.uploaded": { area: "amit", source: "server" },

  // Cabinet and settings
  "therapist.added": { area: "settings", source: "server" },
  "letterhead.saved": { area: "settings", source: "server" },
  "crises_module.toggled": { area: "settings", source: "server" },
  "hide_names.toggled": { area: "settings", source: "server" },
  "locale.changed": { area: "settings", source: "server" },
} as const satisfies Record<string, { area: string; source: "server" | "client" }>;

export type EventName = keyof typeof EVENTS;
export type EventProps = Record<string, string | number | boolean>;

export function isEventName(value: unknown): value is EventName {
  return typeof value === "string" && Object.hasOwn(EVENTS, value);
}

export const CLIENT_EVENTS = (Object.keys(EVENTS) as EventName[]).filter((name) => EVENTS[name].source === "client");

const MAX_PROPS = 5;
const MAX_PROP_LENGTH = 64;

/**
 * Keeps props small and non-identifying: at most 5 short primitive values with simple
 * keys. Callers pass enum-like values (a recipient, a test id, a provider), never text.
 */
export function sanitizeProps(props: Record<string, unknown> | undefined): EventProps | null {
  if (!props) return null;
  const clean: EventProps = {};
  for (const [key, value] of Object.entries(props)) {
    if (Object.keys(clean).length >= MAX_PROPS) break;
    if (!/^[a-zA-Z][a-zA-Z0-9_]{0,31}$/.test(key)) continue;
    if (typeof value === "string") clean[key] = value.slice(0, MAX_PROP_LENGTH);
    else if (typeof value === "boolean" || (typeof value === "number" && Number.isFinite(value))) clean[key] = value;
  }
  return Object.keys(clean).length ? clean : null;
}
