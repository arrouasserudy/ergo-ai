/**
 * The pages of the app as route patterns, so a page view never stores a real id:
 * `/children/0b1c…/progress` is recorded as `/children/[id]/progress`. A test checks this
 * list against the page files under `src/app/(app)` (pages that only redirect, and the
 * admin usage pages, are left out).
 */
export const APP_ROUTES = [
  "/",
  "/account",
  "/assessments",
  "/assessments/[testId]",
  "/calendar",
  "/children",
  "/children/new",
  "/children/[id]",
  "/children/[id]/assessments",
  "/children/[id]/assessments/[assessmentId]",
  "/children/[id]/episodes",
  "/children/[id]/episodes/[episodeId]",
  "/children/[id]/forms",
  "/children/[id]/forms/[formId]",
  "/children/[id]/profile",
  "/children/[id]/progress",
  "/children/[id]/reports",
  "/children/[id]/timeline",
  "/crises",
  "/expert/library",
  "/forms",
  "/forms/[id]",
  "/groups",
  "/groups/[id]",
  "/reports",
  "/reports/new",
  "/reports/[id]",
  "/settings",
] as const;

export type AppRoute = (typeof APP_ROUTES)[number];

const isDynamic = (segment: string) => segment.startsWith("[");
const split = (path: string) => path.split("/").filter(Boolean);
const PATTERNS = APP_ROUTES.map((route) => ({ route, segments: split(route) }));

/**
 * The route pattern of a pathname, or null for a path the app does not list. Static
 * segments win over dynamic ones (`/children/new` is not `/children/[id]`).
 */
export function routeOf(pathname: string): AppRoute | null {
  const parts = split(pathname);
  let best: { route: AppRoute; score: number } | null = null;
  for (const { route, segments } of PATTERNS) {
    if (segments.length !== parts.length) continue;
    if (!segments.every((segment, i) => isDynamic(segment) || segment === parts[i])) continue;
    // Earlier static segments weigh more, so the most specific pattern wins.
    const score = segments.reduce((sum, segment, i) => sum + (isDynamic(segment) ? 0 : 2 ** (segments.length - i)), 0);
    if (!best || score > best.score) best = { route, score };
  }
  return best?.route ?? null;
}

export function isAppRoute(value: unknown): value is AppRoute {
  return typeof value === "string" && (APP_ROUTES as readonly string[]).includes(value);
}
