import type { Locale } from "../i18n";

/** Fixed ids of the demo cabinets (src/db/demo.ts), the same locally and in production. */
export const DEMO_CABINET_IDS = {
  fr: {
    accountId: "eca47fee-2782-49a8-881e-15428925d36e",
    therapistId: "f1c3d5c9-e445-42a8-ad05-515b412e788e",
    email: "demo@ergo-ai.app",
    passwordEnv: "DEMO_PASSWORD",
    /** Interface language set on sign-in (see demoLocale). */
    locale: "fr",
  },
  he: {
    accountId: "3b7e2c41-9d58-4f0a-b6e3-71c2a94d8e15",
    therapistId: "8a1f6d27-c34b-4e95-9f02-5d6b8e3a7c40",
    email: "demo-he@ergo-ai.app",
    passwordEnv: "DEMO_HE_PASSWORD",
    /** Interface language set on sign-in (see demoLocale). */
    locale: "he",
  },
  en: {
    accountId: "c95d0a3e-6b17-4c82-8e4f-2a9b7d1e6f53",
    therapistId: "4e2b9c70-1f8d-4a36-b5c1-9e7d3f0a2b84",
    email: "demo-en@ergo-ai.app",
    passwordEnv: "DEMO_EN_PASSWORD",
    /** Interface language set on sign-in (see demoLocale). */
    locale: "en",
  },
} as const;

export type DemoCabinetKey = keyof typeof DEMO_CABINET_IDS;
export const DEMO_CABINET_KEYS = Object.keys(DEMO_CABINET_IDS) as DemoCabinetKey[];

/** The French demo cabinet (the first one). */
export const DEMO_ACCOUNT_ID = DEMO_CABINET_IDS.fr.accountId;
export const DEMO_THERAPIST_ID = DEMO_CABINET_IDS.fr.therapistId;
export const DEMO_EMAIL = DEMO_CABINET_IDS.fr.email;

/**
 * The interface language of a demo cabinet, set as the locale cookie when one of its
 * therapists signs in (app/actions/auth.ts), so each demo opens in its own language.
 * Null for every other account: their language stays the device's choice (Settings).
 */
export function demoLocale(accountId: string | null | undefined): Locale | null {
  const key = DEMO_CABINET_KEYS.find((k) => DEMO_CABINET_IDS[k].accountId === accountId);
  return key ? DEMO_CABINET_IDS[key].locale : null;
}

/**
 * The demo cabinets named on a command line ("he", "fr en"…), all of them when none is
 * given. An account id is passed through as is (pushing any other local account).
 */
export function resolveDemoTargets(args: string[]): { key: DemoCabinetKey | null; accountId: string }[] {
  if (args.length === 0) return DEMO_CABINET_KEYS.map((key) => ({ key, accountId: DEMO_CABINET_IDS[key].accountId }));
  return args.map((arg) => {
    if (arg in DEMO_CABINET_IDS) return { key: arg as DemoCabinetKey, accountId: DEMO_CABINET_IDS[arg as DemoCabinetKey].accountId };
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(arg)) {
      const key = DEMO_CABINET_KEYS.find((k) => DEMO_CABINET_IDS[k].accountId === arg) ?? null;
      return { key, accountId: arg };
    }
    throw new Error(`Unknown demo cabinet "${arg}" (expected ${DEMO_CABINET_KEYS.join(", ")} or an account id).`);
  });
}
