/**
 * Seeds the local database with demo accounts, therapists and fictional,
 * pseudonymized children (the ones from the PRD mockups).
 * Skips if data exists; pass --reset to wipe first.
 *
 * Logins (password "demo1234", or $SEED_PASSWORD):
 *   michaela@demo.local   owner  · Cabinet Démo
 *   colleague@demo.local  member · Cabinet Démo
 *   other@demo.local      owner  · Autre cabinet (isolation check)
 */
import { hashPassword } from "better-auth/crypto";
import { db } from "./index";
import { accounts, authCredentials, children, therapists, type NewChild, type TherapistRole } from "./schema";

// Override with SEED_PASSWORD when seeding anything reachable from the internet.
const DEMO_PASSWORD = process.env.SEED_PASSWORD ?? "demo1234";

const yearsAgo = (years: number, month = 3, day = 12) => {
  const d = new Date();
  return new Date(d.getFullYear() - years, month, day).toISOString().slice(0, 10);
};

type ChildSeed = Omit<NewChild, "accountId">;

const DEMO_CHILDREN: ChildSeed[] = [
  {
    initials: "L. M.",
    birthDate: yearsAgo(7, 1, 3),
    referralReason: "Motricité fine, régulation sensorielle",
    schoolLevel: "CE1",
    followUpStart: "2026-01-15",
    medicalHistory: "Pas d'antécédent notable. Otites à répétition entre 2 et 4 ans.",
    birthHistory: "Né à 36 SA, sans complication.",
    familyComposition: "Vit avec ses deux parents.",
    siblingsCount: 1,
    knownTriggers: "Chaussettes mal ajustées, étiquettes, porte qui claque dans le couloir.",
    hyperSensitivities: ["noise", "clothing", "textures"],
    hypoReactivities: [],
    seeksDeepPressure: true,
    backgroundFactors: ["sleep", "hunger"],
    warningSigns: "Se bouche les oreilles, s'agite sur sa chaise.",
    calmingStrategies: ["removeCause", "weightedCushion", "quietCorner"],
    interests: ["dinosaurs", "space"],
  },
  { initials: "N. A.", birthDate: yearsAgo(5, 6, 20), referralReason: "Bilan initial — graphomotricité", schoolLevel: "Grande section", followUpStart: "2026-09-01" },
  {
    initials: "Y. B.",
    birthDate: yearsAgo(9, 9, 2),
    referralReason: "Écriture, organisation du geste",
    schoolLevel: "CM1",
    followUpStart: "2025-10-06",
    geneticDiagnoses: "TDC (trouble développemental de la coordination) diagnostiqué en 2025.",
    interests: ["cars"],
  },
  { initials: "S. K.", birthDate: yearsAgo(6, 11, 8), referralReason: "Autonomie à l'habillage", schoolLevel: "CP", followUpStart: "2026-03-10" },
  {
    initials: "E. D.",
    birthDate: yearsAgo(8, 4, 17),
    referralReason: "Régulation émotionnelle, hypersensibilité auditive",
    schoolLevel: "CE2",
    followUpStart: "2025-11-20",
    hyperSensitivities: ["noise", "light"],
    calmingStrategies: ["headphones", "break"],
  },
  { initials: "T. R.", birthDate: yearsAgo(4, 2, 25), referralReason: "Alimentation, sensibilité orale", schoolLevel: "Moyenne section", followUpStart: "2026-06-02", hypoReactivities: ["oral", "satiety"] },
  { initials: "M. L.", birthDate: yearsAgo(10, 7, 30), referralReason: "Aménagements scolaires", schoolLevel: "CM2", followUpStart: "2024-09-16", status: "archived" },
];

const OTHER_CHILDREN: ChildSeed[] = [
  { initials: "A. P.", birthDate: yearsAgo(6, 0, 9), referralReason: "Motricité globale", schoolLevel: "CP", followUpStart: "2026-02-02" },
];

async function createTherapist(accountId: string, role: TherapistRole, name: string, email: string) {
  const therapist = db.insert(therapists).values({ accountId, role, name, email }).returning().get();
  db.insert(authCredentials)
    .values({ userId: therapist.id, accountId: therapist.id, providerId: "credential", password: await hashPassword(DEMO_PASSWORD) })
    .run();
  return therapist;
}

async function seed() {
  const demo = db.insert(accounts).values({ name: "Cabinet Démo" }).returning().get();
  const owner = await createTherapist(demo.id, "owner", "Michaela Cohen", "michaela@demo.local");
  await createTherapist(demo.id, "member", "Sarah Levy", "colleague@demo.local");
  db.insert(children)
    .values(DEMO_CHILDREN.map((c) => ({ ...c, accountId: demo.id, createdBy: owner.id })))
    .run();

  const other = db.insert(accounts).values({ name: "Autre cabinet" }).returning().get();
  const otherOwner = await createTherapist(other.id, "owner", "Noa Dubois", "other@demo.local");
  db.insert(children)
    .values(OTHER_CHILDREN.map((c) => ({ ...c, accountId: other.id, createdBy: otherOwner.id })))
    .run();
}

async function main() {
  const reset = process.argv.includes("--reset");
  // Deleting accounts cascades to therapists, credentials, sessions and children.
  if (reset) db.delete(accounts).run();

  if (db.select({ id: accounts.id }).from(accounts).limit(1).all().length) {
    console.log("Database already has data — skipping (use --reset to reseed).");
    return;
  }
  await seed();
  console.log(`Seeded 2 accounts, 3 therapists (password "${DEMO_PASSWORD}"), ${DEMO_CHILDREN.length + OTHER_CHILDREN.length} children.`);
}

main();
