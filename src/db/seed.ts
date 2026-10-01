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
import { ensureBuiltinForms } from "../lib/forms/builtin";
import { db } from "./index";
import {
  accounts,
  authCredentials,
  children,
  episodes,
  reports,
  reportVariants,
  therapists,
  type NewChild,
  type ReportDocType,
  type ReportRecipient,
  type ReportSection,
  type TherapistRole,
} from "./schema";

// Override with SEED_PASSWORD when seeding anything reachable from the internet.
const DEMO_PASSWORD = process.env.SEED_PASSWORD ?? "demo1234";

const yearsAgo = (years: number, month = 3, day = 12) => {
  const d = new Date();
  return new Date(d.getFullYear() - years, month, day).toISOString().slice(0, 10);
};

type ChildSeed = Omit<NewChild, "accountId">;

const DEMO_CHILDREN: ChildSeed[] = [
  {
    name: "L. M.",
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
  { name: "N. A.", birthDate: yearsAgo(5, 6, 20), referralReason: "Bilan initial — graphomotricité", schoolLevel: "Grande section", followUpStart: "2026-09-01" },
  {
    name: "Y. B.",
    birthDate: yearsAgo(9, 9, 2),
    referralReason: "Écriture, organisation du geste",
    schoolLevel: "CM1",
    followUpStart: "2025-10-06",
    geneticDiagnoses: "TDC (trouble développemental de la coordination) diagnostiqué en 2025.",
    interests: ["cars"],
  },
  { name: "S. K.", birthDate: yearsAgo(6, 11, 8), referralReason: "Autonomie à l'habillage", schoolLevel: "CP", followUpStart: "2026-03-10" },
  {
    name: "E. D.",
    birthDate: yearsAgo(8, 4, 17),
    referralReason: "Régulation émotionnelle, hypersensibilité auditive",
    schoolLevel: "CE2",
    followUpStart: "2025-11-20",
    hyperSensitivities: ["noise", "light"],
    calmingStrategies: ["headphones", "break"],
  },
  { name: "T. R.", birthDate: yearsAgo(4, 2, 25), referralReason: "Alimentation, sensibilité orale", schoolLevel: "Moyenne section", followUpStart: "2026-06-02", hypoReactivities: ["oral", "satiety"] },
  { name: "M. L.", birthDate: yearsAgo(10, 7, 30), referralReason: "Aménagements scolaires", schoolLevel: "CM2", followUpStart: "2024-09-16", status: "archived" },
];

const OTHER_CHILDREN: ChildSeed[] = [
  { name: "A. P.", birthDate: yearsAgo(6, 0, 9), referralReason: "Motricité globale", schoolLevel: "CP", followUpStart: "2026-02-02" },
];

/** A date `days` ago at the given UTC time (Israel is UTC+3 in September: 10:00 UTC = 13:00 local). */
const daysAgo = (days: number, hourUtc: number, minute = 0) => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  d.setUTCHours(hourUtc, minute, 0, 0);
  return d;
};

type EpisodeSeed = {
  days: number;
  hour: number;
  minutes: number;
  kind: "crisis" | "difficulty";
  situation?: string;
  antecedent?: string;
  behavior?: string;
  causes: string[];
  helped: string[];
};

// L. M.: the history shown in the PRD mockup, plus enough to surface patterns
// (clothing as frequent trigger, short nights as background factor, around lunch).
const LM_EPISODES: EpisodeSeed[] = [
  { days: 7, hour: 10, minutes: 12, kind: "crisis", antecedent: "Début de séance, nouvelles chaussures", behavior: "Pleurs, refus de marcher", causes: ["clothing"], helped: ["removeCause"] },
  { days: 14, hour: 10, minutes: 8, kind: "crisis", antecedent: "Porte du couloir claquée", behavior: "Mains sur les oreilles, cris", causes: ["noise"], helped: ["headphones", "quietCorner"] },
  { days: 21, hour: 10, minutes: 20, kind: "crisis", antecedent: "Nuit courte (parents)", behavior: "Opposition sur l'exercice", causes: ["sleep", "tooDifficult"], helped: ["break", "weightedCushion"] },
  { days: 28, hour: 10, minutes: 15, kind: "crisis", antecedent: "Chaussette plissée", behavior: "Se roule au sol", causes: ["clothing"], helped: ["removeCause"] },
  { days: 33, hour: 10, minutes: 10, kind: "crisis", antecedent: "Étiquette du nouveau pull", behavior: "Tire sur son pull, pleure", causes: ["clothing", "sleep"], helped: ["removeCause", "weightedCushion"] },
  { days: 40, hour: 13, minutes: 6, kind: "crisis", antecedent: "Fin d'activité peinture", behavior: "Refuse de ranger, jette les pinceaux", causes: ["transition", "clothing"], helped: ["quietCorner"] },
  { days: 10, hour: 8, minutes: 5, kind: "difficulty", situation: "closedDoor", antecedent: "Porte de la salle de soin fermée", behavior: "Reste dans le couloir, refuse d'entrer", causes: ["closedDoor", "unfamiliarPlace"], helped: ["Porte laissée ouverte"] },
  { days: 17, hour: 8, minutes: 4, kind: "difficulty", situation: "closedDoor", antecedent: "Arrivée, porte fermée", behavior: "S'assoit par terre devant la porte", causes: ["closedDoor"], helped: ["Porte laissée ouverte", "Annoncer ce qu'il y a derrière"] },
];

const TR_EPISODES: EpisodeSeed[] = [
  { days: 5, hour: 10, minutes: 20, kind: "difficulty", situation: "eating", antecedent: "Purée servie tiède", behavior: "Repousse l'assiette, ferme la bouche", causes: ["textures", "oralChange"], helped: ["Texture plus lisse", "break"] },
  { days: 12, hour: 10, minutes: 15, kind: "difficulty", situation: "eating", antecedent: "Nouvel aliment au déjeuner", behavior: "Refus de goûter, pleure", causes: ["textures", "routineChange"], helped: ["Texture plus lisse"] },
];

function episodeRows(seeds: EpisodeSeed[], accountId: string, childId: string, recordedBy: string) {
  return seeds.map(({ days, hour, minutes, situation, ...rest }) => {
    const startedAt = daysAgo(days, hour);
    return {
      ...rest,
      situation: situation ?? null,
      accountId,
      childId,
      recordedBy,
      status: "closed" as const,
      startedAt,
      endedAt: new Date(startedAt.getTime() + minutes * 60_000),
    };
  });
}

type ReportSeed = {
  name: string;
  docType: ReportDocType;
  days: number;
  notes: string;
  /** Recipients with a generated version; `state` applies to all of them. */
  variants: Partial<Record<ReportRecipient, ReportSection[]>>;
  recipients: ReportRecipient[];
  state: "draft" | "validated" | "exported";
};

const LM_NOTES = `- tenue du crayon : pince tripode plus stable qu'en juin, encore fatigue après ~10 min
- découpage ciseaux : suit une ligne courbe avec aide verbale
- boutonnage : 3 boutons sur 5 seul
- sensoriel : recherche de pression au début, s'apaise avec le coussin lesté
- attention : bonne sur 15 min, décroche au bruit du couloir
- à la maison : parents signalent moins de crises à l'habillage
- à proposer : poursuite pâte à modeler + pinces à linge, aménagement place au calme en classe`;

// The "Mes comptes-rendus" mockup: one draft being written, the rest validated or exported.
const REPORTS: ReportSeed[] = [
  {
    name: "L. M.",
    docType: "follow_up",
    days: 1,
    notes: LM_NOTES,
    recipients: ["parents", "doctor", "school"],
    state: "draft",
    variants: {
      parents: [
        { heading: "Ce qui avance", body: "L. M. tient son crayon de façon plus stable qu'en juin. Il arrive à boutonner seul 3 boutons sur 5, et vous nous dites que l'habillage se passe mieux à la maison : c'est une belle progression." },
        { heading: "Ce qui reste difficile", body: "Sa main se fatigue encore après une dizaine de minutes d'écriture, et il a besoin qu'on le guide pour découper une ligne courbe." },
        { heading: "À la maison cette semaine", body: "- 5 minutes par jour de pâte à modeler\n- un jeu avec des pinces à linge pour renforcer les doigts" },
      ],
    },
  },
  {
    name: "N. A.",
    docType: "initial_assessment",
    days: 2,
    notes: "- bilan graphomotricité GS\n- tenue crayon palmaire, changements de main fréquents\n- copie de formes : cercle ok, carré difficile\n- à proposer : suivi hebdomadaire 3 mois",
    recipients: ["doctor"],
    state: "validated",
    variants: {
      doctor: [
        { heading: "Contexte", body: "Bilan initial demandé pour des difficultés de graphomotricité en grande section." },
        { heading: "Observations et résultats", body: "- Prise du crayon palmaire, changements de main fréquents\n- Copie de formes : cercle réussi, carré non réussi" },
        { heading: "Recommandations", body: "Suivi hebdomadaire en ergothérapie sur 3 mois, puis réévaluation." },
      ],
    },
  },
  {
    name: "Y. B.",
    docType: "follow_up",
    days: 3,
    notes: "- écriture plus lisible, vitesse toujours lente\n- ordinateur en classe : essai concluant",
    recipients: ["parents", "school"],
    state: "exported",
    variants: {
      parents: [{ heading: "Ce qui avance", body: "Son écriture est plus lisible. L'essai de l'ordinateur en classe est concluant." }],
      school: [{ heading: "Aménagements proposés en classe", body: "- Ordinateur pour les écrits longs\n- Temps supplémentaire pour la copie" }],
    },
  },
  {
    name: "S. K.",
    docType: "follow_up",
    days: 6,
    notes: "- courrier pédiatre : progrès habillage, demande de renouvellement de prise en charge",
    recipients: ["doctor"],
    state: "exported",
    variants: { doctor: [{ heading: "Objet", body: "Demande de renouvellement de la prise en charge en ergothérapie : progrès nets à l'habillage, autonomie encore partielle." }] },
  },
  {
    name: "E. D.",
    docType: "follow_up",
    days: 8,
    notes: "- casque anti-bruit bien accepté\n- moins de crises à la cantine",
    recipients: ["parents"],
    state: "validated",
    variants: { parents: [{ heading: "Ce qui avance", body: "Le casque anti-bruit est bien accepté et il y a moins de crises à la cantine." }] },
  },
  {
    name: "T. R.",
    docType: "initial_assessment",
    days: 10,
    notes: "- bilan alimentation : hyporéactivité orale, mange très vite\n- à proposer : cuillère lestée à essayer",
    recipients: ["parents", "doctor"],
    state: "exported",
    variants: {
      parents: [{ heading: "Ce que nous avons observé", body: "T. R. sent peu ce qui se passe dans sa bouche, ce qui l'amène à manger très vite." }],
      doctor: [{ heading: "Observations", body: "Hyporéactivité orale, prise alimentaire rapide. Essai d'une cuillère lestée proposé." }],
    },
  },
  {
    name: "M. L.",
    docType: "recommendations",
    days: 13,
    notes: "- aménagements CM2 : place au calme, consignes écrites",
    recipients: ["school"],
    state: "exported",
    variants: { school: [{ heading: "Aménagements proposés en classe", body: "- Place au calme, loin de la porte\n- Consignes données aussi par écrit" }] },
  },
];

function seedReports(seeds: ReportSeed[], accountId: string, authorId: string, kidId: (name: string) => string) {
  for (const seed of seeds) {
    const date = daysAgo(seed.days, 12);
    const report = db
      .insert(reports)
      .values({
        accountId,
        childId: kidId(seed.name),
        authorId,
        docType: seed.docType,
        sessionDate: date.toISOString().slice(0, 10),
        notes: seed.notes,
        recipients: seed.recipients,
        status: seed.state,
        createdAt: date,
        updatedAt: date,
      })
      .returning({ id: reports.id })
      .get();
    for (const [recipient, sections] of Object.entries(seed.variants)) {
      db.insert(reportVariants)
        .values({
          reportId: report.id,
          accountId,
          recipient: recipient as ReportRecipient,
          generated: sections,
          sections,
          model: "seed",
          generatedAt: date,
          validatedAt: seed.state === "draft" ? null : date,
          exportedAt: seed.state === "exported" ? date : null,
        })
        .run();
    }
  }
}

async function createTherapist(accountId: string, role: TherapistRole, name: string, email: string) {
  const therapist = db.insert(therapists).values({ accountId, role, name, email }).returning().get();
  db.insert(authCredentials)
    .values({ userId: therapist.id, accountId: therapist.id, providerId: "credential", password: await hashPassword(DEMO_PASSWORD) })
    .run();
  return therapist;
}

async function seed() {
  const demo = db
    .insert(accounts)
    .values({ name: "Cabinet Démo", letterhead: "12 rue des Lilas, 75011 Paris\n01 23 45 67 89 · contact@cabinet-demo.fr\nN° ADELI 759312345" })
    .returning()
    .get();
  const owner = await createTherapist(demo.id, "owner", "Michaela Cohen", "michaela@demo.local");
  await createTherapist(demo.id, "member", "Sarah Levy", "colleague@demo.local");
  const demoKids = db
    .insert(children)
    .values(DEMO_CHILDREN.map((c) => ({ ...c, accountId: demo.id, createdBy: owner.id })))
    .returning({ id: children.id, name: children.name })
    .all();
  const kidId = (name: string) => demoKids.find((k) => k.name === name)!.id;
  db.insert(episodes)
    .values([
      ...episodeRows(LM_EPISODES, demo.id, kidId("L. M."), owner.id),
      ...episodeRows(TR_EPISODES, demo.id, kidId("T. R."), owner.id),
    ])
    .run();
  seedReports(REPORTS, demo.id, owner.id, kidId);

  const other = db.insert(accounts).values({ name: "Autre cabinet" }).returning().get();
  const otherOwner = await createTherapist(other.id, "owner", "Noa Dubois", "other@demo.local");
  db.insert(children)
    .values(OTHER_CHILDREN.map((c) => ({ ...c, accountId: other.id, createdBy: otherOwner.id })))
    .run();
  ensureBuiltinForms(db, [demo.id, other.id]);
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
  console.log(
    `Seeded 2 accounts, 3 therapists (password "${DEMO_PASSWORD}"), ${DEMO_CHILDREN.length + OTHER_CHILDREN.length} children, ${LM_EPISODES.length + TR_EPISODES.length} episodes, ${REPORTS.length} reports.`,
  );
}

main();
