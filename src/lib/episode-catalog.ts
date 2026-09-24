/**
 * Catalog of possible causes to review during a crisis or an everyday difficulty,
 * and of everyday situations. Keys only; French labels live in i18n/fr.ts.
 *
 * Grounded in the PRD: A-B-C analysis, immediate triggers vs background
 * "setting events", and the systematic body/pain check (p.7) so a behaviour
 * change is not read as purely behavioural when discomfort may be the cause.
 */

export const CAUSE_GROUPS = {
  sensory: ["clothing", "noise", "light", "touch", "smells", "textures", "crowd"],
  body: [
    "pain",
    "injury",
    "movementChange",
    "unusualHypersensitivity",
    "hyporeactivity",
    "seeksPressure",
    "mealChanges",
    "oralChange",
    "toilet",
  ],
  background: ["sleep", "fatigue", "hunger", "thirst", "illness"],
  environment: ["routineChange", "transition", "waiting", "closedDoor", "unfamiliarPlace", "personChange"],
  task: ["tooDifficult", "demand", "frustration", "lossOfControl"],
} as const;

export type CauseGroup = keyof typeof CAUSE_GROUPS;
export type CauseKey = (typeof CAUSE_GROUPS)[CauseGroup][number];

export const CAUSE_KEYS = Object.values(CAUSE_GROUPS).flat() as CauseKey[];

export function causeGroup(key: string): CauseGroup | null {
  for (const [group, keys] of Object.entries(CAUSE_GROUPS)) {
    if ((keys as readonly string[]).includes(key)) return group as CauseGroup;
  }
  return null;
}

/** Background factors ("setting events"): shown as a separate pattern in the history. */
export const BACKGROUND_CAUSES: readonly string[] = [...CAUSE_GROUPS.background, "pain", "illness"];

/**
 * Shown in the main check-list even without history, so a new child still gets a
 * short, sensible list. Pain is always there: the PRD asks to check it systematically.
 */
export const DEFAULT_CAUSES: CauseKey[] = ["clothing", "noise", "fatigue", "hunger", "routineChange", "tooDifficult", "pain"];

/** Situations that are not crises but where the team needs to understand a refusal or difficulty. */
export const SITUATION_OPTIONS = [
  "eating",
  "hygiene",
  "enteringRoom",
  "closedDoor",
  "activity",
  "transition",
] as const;

/** Causes worth surfacing first for a given situation, before any history exists. */
export const SITUATION_CAUSES: Record<string, CauseKey[]> = {
  eating: ["textures", "smells", "oralChange", "mealChanges", "pain", "hunger"],
  hygiene: ["touch", "noise", "textures", "lossOfControl", "pain"],
  enteringRoom: ["unfamiliarPlace", "noise", "light", "crowd", "personChange"],
  closedDoor: ["closedDoor", "unfamiliarPlace", "lossOfControl"],
  activity: ["tooDifficult", "demand", "frustration", "fatigue"],
  transition: ["transition", "routineChange", "waiting", "lossOfControl"],
};

/**
 * Maps the child's sensory-profile answers (entretien) to causes, so the very first
 * check-list is already personalised. Keys are the profile tag keys from lib/options.ts.
 */
export const PROFILE_TO_CAUSES: Record<string, Record<string, CauseKey>> = {
  hyperSensitivities: {
    noise: "noise",
    light: "light",
    textures: "textures",
    clothing: "clothing",
    touch: "touch",
    smells: "smells",
    tastes: "oralChange",
  },
  hypoReactivities: {
    pain: "pain",
    oral: "oralChange",
    satiety: "mealChanges",
    proprioception: "seeksPressure",
  },
  backgroundFactors: {
    sleep: "sleep",
    hunger: "hunger",
    routine: "routineChange",
    fatigue: "fatigue",
    pain: "pain",
  },
};
