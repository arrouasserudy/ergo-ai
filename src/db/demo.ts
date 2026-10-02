/**
 * The demo cabinets: one per language (fr, he, en), each with an owner therapist and four
 * realistic, fictional patients, with every kind of data the app supports (profile, crises
 * and difficulties, reports, forms, OT tests, planned events), spread over up to three years and dated
 * relative to today.
 *
 *   pnpm demo:seed [fr|he|en …]   rebuilds them from scratch (all by default; local database, or $DATABASE_PATH)
 *   pnpm demo:push [fr|he|en …]   copies them to production (scripts/demo/push.sh)
 *
 * Content: src/db/demo/{fr,he,en}.ts; shared builders: demo/kit.ts; insertion: demo/seed.ts.
 * Logins and fixed ids: demo-ids.ts; passwords from .env.local (DEMO_PASSWORD,
 * DEMO_HE_PASSWORD, DEMO_EN_PASSWORD), never committed. Only the demo accounts are touched:
 * each is deleted by its fixed id (cascades) and recreated. Every id is fixed or derived
 * from a stable key, so local and production stay aligned and links survive a reseed.
 *
 * Every new feature must also give the children of every demo cabinet the new kind of data (see CLAUDE.md).
 */
import { resolveDemoTargets } from "./demo-ids";
import { en } from "./demo/en";
import { fr } from "./demo/fr";
import { he } from "./demo/he";
import type { DemoCabinet } from "./demo/kit";
import { seedCabinet } from "./demo/seed";

const CABINETS: Record<string, DemoCabinet> = { fr, he, en };

async function main() {
  const targets = resolveDemoTargets(process.argv.slice(2));
  const cabinets = targets.map((t) => (t.key ? CABINETS[t.key] : null) ?? fail(`${t.accountId} is not a demo cabinet.`));
  for (const cabinet of cabinets) {
    const { passwordEnv } = cabinet.ids;
    const password = process.env[passwordEnv];
    if (!password || password.length < 12) fail(`${passwordEnv} is missing (or shorter than 12 characters). Add it to .env.local: ${passwordEnv}=<a strong random password>`);
  }
  for (const cabinet of cabinets) {
    const { passwordEnv, email, accountId } = cabinet.ids;
    const { names, counts, scores } = await seedCabinet(cabinet, process.env[passwordEnv]!);
    console.log(`Demo cabinet "${cabinet.key}" rebuilt (${accountId}): login ${email} (password: ${passwordEnv} from .env.local).`);
    console.log(`  ${names.join(", ")}`);
    console.log(`  ${counts.episodes} episodes, ${counts.reports} reports (${counts.variants} versions, ${counts.styleExamples} style examples), ${counts.forms} child forms, ${counts.tests} OT tests, ${counts.events} events.`);
    console.log("  Test scores:");
    console.log(scores.join("\n"));
  }
}

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
