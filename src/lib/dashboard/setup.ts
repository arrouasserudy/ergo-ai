/**
 * The getting-started guide of the home page (pure, tested): one-time steps, each detected
 * from rows that already exist (nothing is ticked by hand). Steps about the cabinet are
 * done for every therapist once someone did them; asking Amit is personal.
 */

export const SETUP_STEPS = ["child", "letterhead", "autoForm", "parentLink", "assessment", "report", "export", "amit"] as const;
export type SetupStep = (typeof SETUP_STEPS)[number];

/** Steps only the owner can do (members never see them). */
const OWNER_STEPS: SetupStep[] = ["letterhead"];

export const SETUP_LINKS: Record<SetupStep, string> = {
  child: "/children/new",
  letterhead: "/settings#letterhead",
  autoForm: "/forms",
  parentLink: "/children",
  assessment: "/assessments",
  report: "/reports/new",
  export: "/reports",
  amit: "/?amit=new",
};

export type SetupGuide = {
  steps: { key: SetupStep; done: boolean; href: string }[];
  done: number;
  total: number;
  /** The first step left, highlighted in the list. */
  next: SetupStep | null;
};

export function setupGuide(done: ReadonlySet<SetupStep>, isOwner: boolean): SetupGuide {
  const steps = SETUP_STEPS.filter((key) => isOwner || !OWNER_STEPS.includes(key)).map((key) => ({ key, done: done.has(key), href: SETUP_LINKS[key] }));
  return {
    steps,
    done: steps.filter((s) => s.done).length,
    total: steps.length,
    next: steps.find((s) => !s.done)?.key ?? null,
  };
}
