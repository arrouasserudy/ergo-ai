/**
 * French demo cabinet: a French-speaking practice in Netanya (Israel). Families speak
 * French at home, children go to Israeli schools (Sunday to Thursday); the forms shipped
 * with the app are in Hebrew and filled in Hebrew by the therapist, the cabinet's own
 * questionnaires are in French.
 */
import { knoxPreschoolPlayScale } from "../../lib/assessments/definitions/knox-preschool-play-scale";
import { sensoryProfile2Child } from "../../lib/assessments/definitions/sensory-profile-2-child";
import { date, matrix, multi, number, scale, section, single, text, textarea, yesNo } from "../../lib/forms/defaults/build";
import type { LlmForm } from "../../lib/forms/schema";
import { DEMO_CABINET_IDS } from "../demo-ids";
import { addDays, addMonths, at, day, EMPTY_TEST, knoxAnswers, s, schoolWeek, sp2Answers, sqlTimestamp, TODAY, type ChildSpec, type DemoCabinet } from "./kit";

const { workday, wd } = schoolWeek("fri-sat");

const ANAMNESIS: LlmForm = {
  title: "Questionnaire d'anamnèse — parents",
  description: "À remplir par les parents avant le bilan initial. Ces informations restent confidentielles et ne sont partagées qu'avec votre accord.",
  language: "fr",
  sections: [
    section("L'enfant", [
      text("Nom et prénom de l'enfant", { identifying: true, required: true }),
      date("Date de naissance", { identifying: true, required: true }),
      multi("Langues parlées à la maison", ["Français", "Hébreu", "Anglais"], { other: true }),
    ]),
    section("Grossesse et naissance", [
      number("Terme à la naissance", "SA"),
      number("Poids de naissance", "g"),
      yesNo("Hospitalisation en néonatologie"),
      textarea("Si oui, durée et motif"),
    ]),
    section("Premières acquisitions", [
      date("Tient assis(e) seul(e) (date approximative)"),
      date("Premiers pas (date approximative)"),
      date("Premiers mots (date approximative)"),
      single("Propreté de jour", ["Acquise", "En cours", "Pas encore"]),
    ]),
    section("Diagnostics et suivis", [
      text("Diagnostic(s) posé(s)"),
      date("Date du diagnostic"),
      text("Posé par"),
      multi("Suivis en cours ou passés", ["Orthophonie", "Kinésithérapie", "Psychomotricité", "Psychologue", "Neuropédiatre", "Orthoptie"], { other: true }),
      date("Début de l'orthophonie"),
      date("Début de la kinésithérapie"),
      date("Dernière consultation chez le neuropédiatre"),
      yesNo("Traitement médicamenteux"),
      text("Si oui, lequel"),
    ]),
    section("Vie quotidienne", [
      single("Sommeil", ["Bon", "Endormissement difficile", "Réveils nocturnes fréquents"], { other: true }),
      textarea("Alimentation : ce qu'il ou elle mange, ce qu'il ou elle refuse"),
      single("Habillage", ["Seul(e)", "Avec un peu d'aide", "Avec beaucoup d'aide"]),
      textarea("Quelles sont vos principales inquiétudes ?", { required: true }),
      textarea("Qu'attendez-vous de l'ergothérapie ?"),
    ]),
  ],
};

const BACK_TO_SCHOOL: LlmForm = {
  title: "Questionnaire de rentrée — parents",
  description: "Chaque année en septembre, pour préparer les objectifs de l'année avec vous.",
  language: "fr",
  sections: [
    section("Cette année", [
      text("Classe et établissement"),
      text("Nom de l'enseignant(e) ou de la gannenet", { identifying: true }),
      yesNo("Accompagnant(e) (sayaat) en classe"),
      scale("Comment s'est passée la rentrée ?", 1, 5, "Très difficile", "Très bien"),
    ]),
    section("Depuis l'an dernier", [
      textarea("Qu'est-ce qui a changé ?"),
      multi("Nouveaux suivis", ["Orthophonie", "Kinésithérapie", "Psychomotricité", "Psychologue", "Neuropédiatre"], { other: true }),
      date("Date de début du nouveau suivi"),
      yesNo("Changement de traitement"),
    ]),
    section("Vos priorités", [
      textarea("Sur quoi souhaitez-vous que l'on travaille cette année ?", { required: true }),
      multi("Créneaux possibles pour les séances", ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi"]),
    ]),
  ],
};

const TEACHER: LlmForm = {
  title: "Questionnaire enseignant — fonctionnement en classe",
  description: "À transmettre à l'enseignant(e) par les parents, puis à retourner au cabinet.",
  language: "fr",
  sections: [
    section("Classe", [text("Classe"), date("Date de remplissage")]),
    section("En classe", [
      matrix(
        "Au quotidien, l'élève…",
        [
          "Reste assis(e) pendant une activité",
          "Termine un travail écrit dans le temps donné",
          "Copie au tableau sans erreur",
          "Organise son matériel",
          "Gère les transitions (fin de récréation, changement d'activité)",
          "Participe aux activités de groupe",
        ],
        ["Jamais", "Parfois", "Souvent", "Toujours"],
      ),
      scale("Lisibilité de l'écriture", 1, 5, "Illisible", "Très lisible"),
      multi("Aménagements déjà en place", ["Place près du tableau", "Temps supplémentaire", "Photocopies du cours", "Pauses de mouvement", "Coussin ou siège dynamique", "Ordinateur"], {
        other: true,
      }),
    ]),
    section("Observations", [textarea("Points forts de l'élève"), textarea("Difficultés observées"), textarea("Questions pour l'ergothérapeute")]),
  ],
};

// ---------------------------------------------------------------------------
// 1. Noam Benhamou — 4 years 3 months. Autism (ASD) with severe food selectivity and
// sensory over-responsivity. Followed for 13 months, mostly around meals.

function noam(): ChildSpec {
  const birth = addMonths(TODAY, -51, 14);
  const start = wd(-395);
  const diagnosis = addMonths(birth, 34, 3);
  return {
    key: "noam",
    child: {
      name: "Noam Benhamou",
      birthDate: birth,
      referralReason: "Sélectivité alimentaire sévère, hyper-réactivité sensorielle (TSA)",
      schoolLevel: "Gan tikchoret (maternelle spécialisée), 2e année",
      followUpStart: start,
      medicalHistory:
        "TSA diagnostiqué à 2 ans 10 mois (centre de développement de l'enfant). Reflux gastro-œsophagien la première année. Poids suivi par la pédiatre : courbe au 10e percentile, stable. Supplémentation en fer depuis 1 an.",
      birthHistory: "Né à 39 SA par césarienne programmée, 3 250 g. Allaitement difficile, passage au biberon à 1 mois. Diversification compliquée dès 6 mois : refus des morceaux.",
      surgicalHistory: "Aérateurs transtympaniques à 2 ans et demi (otites séreuses).",
      geneticDiagnoses: "Caryotype et puce ADN normaux.",
      familyHistory: "Un cousin paternel avec TSA. Le père rapporte avoir été « très difficile » à table enfant.",
      familyComposition: "Vit avec ses parents et sa grande sœur (7 ans). Famille arrivée de Lyon il y a 6 ans : français à la maison, hébreu au gan.",
      siblingsCount: 1,
      otherInfo: "Orthophonie (en hébreu) une fois par semaine au gan, psychologue du gan. Une sayaat (accompagnante) dans la classe. Communique par phrases de 2-3 mots, plus en français qu'en hébreu.",
      knownTriggers:
        "Mélanges de textures (morceaux dans une purée, sauce sur les pâtes), odeurs fortes (poisson, œuf, soupe), sèche-mains et sèche-cheveux, chasse d'eau des toilettes publiques, coupe de cheveux, mains sales ou collantes.",
      hyperSensitivities: ["noise", "smells", "textures", "touch", "tastes"],
      hypoReactivities: [],
      seeksDeepPressure: true,
      backgroundFactors: ["sleep", "routine", "hunger"],
      warningSigns: "Se met à fredonner fort, se bouche les oreilles, détourne la tête de l'assiette, haut-le-cœur avant même de goûter.",
      calmingStrategies: ["deepPressure", "headphones", "quietCorner", "Couverture lestée", "Chanson de la routine"],
      interests: ["Trains", "Lettres de l'alphabet", "music"],
      createdAt: sqlTimestamp(at(addDays(start, -3), "09:15")),
    },
    episodes: [
      { at: [418, "19:30"], minutes: 30, kind: "difficulty", situation: "eating", antecedent: "Dîner de Shabbat chez les grands-parents, plats en sauce", behavior: "Refuse de s'asseoir à table, ne mange que du pain blanc", causes: ["smells", "mealChanges", "crowd"], helped: ["Pain apporté de la maison", "removeCause"], notes: "Rapporté par les parents au premier rendez-vous." },
      { at: [406, "10:00"], minutes: 25, kind: "crisis", antecedent: "Aspirateur passé dans le salon", behavior: "Hurle, se cache sous la couette, ne se calme qu'une fois l'appareil rangé", causes: ["noise"], helped: ["deepPressure", "removeCause"], notes: "Rapporté par les parents au premier rendez-vous : « au moins deux fois par semaine »." },
      { at: [397, "12:15"], school: true, minutes: 20, kind: "difficulty", situation: "eating", antecedent: "Premier repas du gan après la rentrée, odeur de poisson dans la salle", behavior: "Haut-le-cœur, sort de la salle avec la sayaat", causes: ["smells", "mealChanges"], helped: ["removeCause", "quietCorner"], notes: "Rapporté par la gannenet au moment du bilan." },
      { at: [391, "08:10"], school: true, minutes: 25, kind: "crisis", antecedent: "Arrivée au gan : nouvelle sayaat pour la rentrée", behavior: "Refuse de lâcher sa mère, crie, se jette au sol à l'entrée", causes: ["personChange", "transition"], helped: ["deepPressure", "Photo de la sayaat montrée à la maison"] },
      { at: [386, "19:40"], minutes: 15, kind: "crisis", antecedent: "Coupe des ongles après le bain", behavior: "Retire ses mains, hurle, donne des coups de pied", causes: ["touch"], helped: ["deepPressure", "Couper deux ongles seulement, puis arrêter"] },
      { at: [380, "12:10"], school: true, minutes: 20, kind: "difficulty", situation: "eating", antecedent: "Repas du gan : riz mélangé avec des petits pois", behavior: "Repousse l'assiette, haut-le-cœur, quitte la table", causes: ["textures", "smells"], helped: ["Assiette à compartiments", "removeCause"], notes: "Rapporté par la gannenet. N'a mangé que le pain de mie apporté de la maison." },
      { at: [377, "13:00"], minutes: 40, kind: "crisis", antecedent: "Repas de Roch Hachana chez les grands-parents : une vingtaine de personnes, poisson sur la table", behavior: "Se bouche les oreilles, crie, se tape la tête contre le mur du couloir", causes: ["crowd", "noise", "smells", "unfamiliarPlace"], helped: ["quietCorner", "deepPressure"], notes: "N'a rien mangé malgré ses aliments préparés. À anticiper pour Souccot : casque et coin calme prévus à l'avance." },
      { at: [362, "12:30"], minutes: 20, kind: "difficulty", situation: "eating", antecedent: "Repas dans la soucca de voisins", behavior: "Reste à l'entrée de la soucca, refuse de s'asseoir, mange debout à côté de son père", causes: ["unfamiliarPlace", "crowd", "smells"], helped: ["headphones", "Ses aliments apportés dans une boîte"], notes: "Mieux qu'à Roch Hachana : pas de crise, casque et boîte préparés à l'avance." },
      { at: [355, "18:15"], minutes: 15, kind: "difficulty", situation: "Toilettes", antecedent: "Sa sœur tire la chasse d'eau pendant qu'il est encore aux toilettes", behavior: "Panique, sort en courant, refuse d'y retourner de la soirée", causes: ["noise", "toilet"], helped: ["headphones", "Tirer la chasse une fois qu'il est sorti"] },
      { at: [352, "18:40"], minutes: 25, kind: "difficulty", situation: "eating", antecedent: "Dîner : soupe de légumes posée sur la table familiale", behavior: "Pleure dès l'odeur, se cache sous la table", causes: ["smells", "mealChanges"], helped: ["Bol de soupe tenu à distance", "removeCause"] },
      { at: [346, "18:30"], minutes: 25, kind: "crisis", antecedent: "Supermarché un jeudi soir : foule, annonces au haut-parleur", behavior: "Se bouche les oreilles, s'allonge au sol dans l'allée, crie", causes: ["crowd", "noise", "unfamiliarPlace"], helped: ["headphones", "deepPressure"], notes: "Les parents ont quitté le magasin. Conseil : courses aux heures creuses, casque toujours dans le sac." },
      { at: [341, "10:00"], school: true, minutes: 10, kind: "difficulty", situation: "eating", antecedent: "Yaourt avec des morceaux de fruits au goûter du gan", behavior: "Recrache, pleure, refuse le reste du goûter", causes: ["textures"], helped: ["Yaourt lisse apporté de la maison", "removeCause"] },
      { at: [336, "12:10"], school: true, minutes: 15, kind: "difficulty", situation: "eating", antecedent: "Repas du gan : pâtes à la bolognaise", behavior: "Trie les pâtes une à une, haut-le-cœur, quitte la table", causes: ["textures", "mealChanges"], helped: ["Assiette à compartiments"] },
      { at: [330, "09:30"], minutes: 35, kind: "crisis", antecedent: "Coupe de cheveux chez le coiffeur (tondeuse électrique)", behavior: "Hurle, se débat, coupe interrompue à la moitié", causes: ["touch", "noise", "unfamiliarPlace"], helped: ["deepPressure", "Séquence en images de la coupe"], notes: "Tondeuse = double difficulté (bruit + vibration). Les parents essaieront aux ciseaux, à la maison, devant un dessin animé." },
      { at: [321, "09:45"], school: true, minutes: 15, kind: "crisis", antecedent: "Peinture à doigts au gan, un enfant lui met de la peinture sur la main", behavior: "Crie, secoue la main, frappe l'enfant", causes: ["touch", "textures"], helped: ["removeCause", "Lingette à disposition", "Pinceau à gros manche"], notes: "Proposé à la gannenet : ne jamais l'obliger à toucher, lui laisser le pinceau." },
      { at: [313, "16:40"], minutes: 20, kind: "difficulty", situation: "enteringRoom", antecedent: "Visite chez la pédiatre (pesée, examen des oreilles)", behavior: "Refuse d'entrer dans le cabinet, se débat pendant l'examen", causes: ["unfamiliarPlace", "touch"], helped: ["deepPressure", "Séquence en images de la visite"] },
      { at: [304, "07:30"], minutes: 10, kind: "difficulty", situation: "eating", antecedent: "Nouveau pain (complet, avec des graines) au petit-déjeuner", behavior: "Retire les graines une à une, puis repousse la tartine", causes: ["textures", "mealChanges"], helped: ["Pain de mie habituel à côté", "Exposition en jeu (toucher, sentir, sans obligation de goûter)"] },
      { at: [301, "12:05"], school: true, minutes: 10, kind: "difficulty", situation: "eating", antecedent: "Nouvel aliment proposé au gan (galette de maïs)", behavior: "Accepte de la toucher, refuse de la porter à la bouche", causes: ["textures"], helped: ["Exposition en jeu (toucher, sentir, sans obligation de goûter)"] },
      { at: [290, "10:30"], school: true, minutes: 20, kind: "crisis", antecedent: "Fête de Hanoukka au gan : chants, beignets, beaucoup de parents", behavior: "Se bouche les oreilles, se réfugie sous une table, refuse d'en sortir", causes: ["noise", "crowd", "smells"], helped: ["quietCorner", "deepPressure"], notes: "Le casque avait été oublié à la maison ce jour-là." },
      { at: [274, "08:00"], school: true, minutes: 15, kind: "difficulty", situation: "transition", antecedent: "Retour au gan après les vacances de Hanoukka", behavior: "Pleure à l'entrée, refuse d'enlever son manteau", causes: ["routineChange", "transition"], helped: ["Chanson de la routine", "Photos de la journée au gan"] },
      { at: [268, "10:30"], school: true, minutes: 18, kind: "crisis", antecedent: "Anniversaire au gan : musique forte, chants, bougies", behavior: "Se bouche les oreilles, crie, se jette au sol", causes: ["noise", "crowd"], helped: ["headphones", "quietCorner"], notes: "Prévoir le casque systématiquement les jours de fête (sayaat prévenue)." },
      { at: [256, "17:30"], minutes: 20, kind: "crisis", antecedent: "Coupe de cheveux à la maison, aux ciseaux, devant un dessin animé", behavior: "Accepte deux minutes, puis crie et se débat", causes: ["touch"], helped: ["deepPressure", "Couverture lestée", "Coupe en plusieurs fois"], notes: "Progrès par rapport au coiffeur : la moitié de la coupe a pu être faite." },
      { at: [240, "19:15"], minutes: 12, kind: "difficulty", situation: "hygiene", antecedent: "Brossage des dents du soir", behavior: "Serre les dents, repousse la brosse, pleure", causes: ["touch", "oralChange"], helped: ["Brosse vibrante choisie par lui", "Chanson de la routine"] },
      { at: [228, "12:05"], school: true, minutes: 8, kind: "difficulty", situation: "eating", antecedent: "Soupe servie au repas du gan", behavior: "S'écarte de la table, haut-le-cœur à l'odeur", causes: ["smells"], helped: ["Plat posé à l'autre bout de la table", "removeCause"] },
      { at: [216, "10:00"], school: true, minutes: 10, kind: "difficulty", situation: "activity", antecedent: "Fête de Pourim au gan : crécelles et musique", behavior: "Reste en retrait avec son casque, participe au défilé à la fin", causes: ["noise", "crowd"], helped: ["headphones"], notes: "Première fête au gan sans crise. A demandé lui-même son casque." },
      { at: [205, "12:15"], school: true, minutes: 15, kind: "difficulty", situation: "eating", antecedent: "Purée maison avec de petits grumeaux", behavior: "Recrache, s'essuie la langue avec la main", causes: ["textures"], helped: ["Purée mixée bien lisse", "Exposition en jeu (toucher, sentir, sans obligation de goûter)"] },
      { at: [185, "20:00"], minutes: 15, kind: "difficulty", situation: "eating", antecedent: "Seder de Pessah chez les grands-parents", behavior: "Reste à table 15 minutes avec son casque, puis demande à aller jouer dans la chambre", causes: ["crowd", "noise", "smells", "mealChanges"], helped: ["headphones", "Ses aliments apportés dans une boîte", "quietCorner"], notes: "Par rapport à Roch Hachana : pas de crise, il a demandé lui-même à sortir." },
      { at: [170, "07:40"], school: true, minutes: 20, kind: "crisis", antecedent: "Trajet vers le gan modifié (travaux sur la route habituelle)", behavior: "Pleure dans la voiture, refuse de descendre, se tape les cuisses", causes: ["routineChange", "transition"], helped: ["deepPressure", "Prévenir avec une photo du nouveau trajet"] },
      { at: [151, "12:10"], school: true, minutes: 8, kind: "difficulty", situation: "eating", antecedent: "Riz avec des légumes coupés au repas du gan", behavior: "Écarte les légumes sur le bord de l'assiette, mange le riz", causes: ["textures"], helped: ["Assiette à compartiments"], notes: "Reste à table jusqu'à la fin du repas." },
      { at: [140, "12:00"], school: true, minutes: 10, kind: "difficulty", situation: "eating", antecedent: "Pâtes servies avec de la sauce tomate", behavior: "Refuse, répète « pâtes toutes seules »", causes: ["textures", "mealChanges"], helped: ["Sauce à part dans un petit bol"], notes: "A trempé lui-même une pâte dans la sauce en fin de repas : une première." },
      { at: [112, "18:30"], minutes: 15, kind: "difficulty", situation: "eating", antecedent: "Poulet pané proposé (nouvel aliment)", behavior: "Le lèche, puis le repose dans le compartiment « pas encore »", causes: ["textures"], helped: ["Exposition en jeu (toucher, sentir, sans obligation de goûter)", "Assiette à compartiments"], notes: "Étape « lécher » atteinte sur l'échelle d'exposition." },
      { at: [84, "17:10"], minutes: 15, kind: "crisis", antecedent: "Sèche-mains électrique dans les toilettes d'un centre commercial", behavior: "Panique, s'enfuit en courant, se cache derrière sa mère", causes: ["noise", "unfamiliarPlace"], helped: ["headphones", "deepPressure"] },
      { at: [60, "10:00"], school: true, minutes: 8, kind: "difficulty", situation: "eating", antecedent: "Collation au gan : melon coupé sur la table commune", behavior: "Haut-le-cœur à l'odeur, s'éloigne de la table", causes: ["smells", "textures"], helped: ["S'asseoir en bout de table, loin du plat", "removeCause"] },
      { at: [12, "17:45"], minutes: 22, kind: "crisis", antecedent: "Fin de journée, plus de Bamba à la maison", behavior: "Pleurs, se tape la tête contre le canapé", causes: ["hunger", "fatigue", "routineChange"], helped: ["deepPressure", "Couverture lestée"], notes: "Nuit très courte la veille (réveil à 4h30, selon les parents)." },
      { at: [5, "12:20"], school: true, minutes: 10, kind: "difficulty", situation: "eating", antecedent: "Pain pita (nouvelle texture) au repas du gan", behavior: "Goûte un petit morceau, le garde en bouche puis le recrache dans la serviette", causes: ["textures"], helped: ["Exposition en jeu (toucher, sentir, sans obligation de goûter)", "Serviette « pour recracher » autorisée"], notes: "Belle étape : a goûté de lui-même, sans qu'on le lui demande." },
    ],
    forms: [
      {
        key: "anamnesis",
        template: "anamnesis",
        created: day(-404),
        sent: day(-404),
        submitted: { at: at(day(-399), "21:40"), by: "parent" },
        answers: {
          "L'enfant": { "Nom et prénom de l'enfant": "Noam Benhamou", "Date de naissance": birth, "Langues parlées à la maison": ["Français", "Hébreu"] },
          "Grossesse et naissance": { "Terme à la naissance": 39, "Poids de naissance": 3250, "Hospitalisation en néonatologie": false },
          "Premières acquisitions": {
            "Tient assis(e) seul(e) (date approximative)": addMonths(birth, 7, 1),
            "Premiers pas (date approximative)": addMonths(birth, 14, 10),
            "Premiers mots (date approximative)": addMonths(birth, 27, 1),
            "Propreté de jour": ["En cours"],
          },
          "Diagnostics et suivis": {
            "Diagnostic(s) posé(s)": "Trouble du spectre de l'autisme",
            "Date du diagnostic": diagnosis,
            "Posé par": "Neuropédiatre, centre de développement de l'enfant",
            "Suivis en cours ou passés": ["Orthophonie", "Psychologue", "Neuropédiatre"],
            "Début de l'orthophonie": addMonths(diagnosis, 2, 1),
            "Dernière consultation chez le neuropédiatre": day(-430),
            "Traitement médicamenteux": false,
          },
          "Vie quotidienne": {
            Sommeil: ["Réveils nocturnes fréquents"],
            "Alimentation : ce qu'il ou elle mange, ce qu'il ou elle refuse":
              "Mange : pâtes nature, riz blanc, pain de mie sans croûte, Bamba, Petit Beurre, yaourt nature, compote de pomme lisse, purée de pommes de terre lisse. Refuse tout morceau, les fruits, la viande, tout ce qui est mélangé. Mange devant un écran sinon il ne mange pas.",
            Habillage: ["Avec beaucoup d'aide"],
            "Quelles sont vos principales inquiétudes ?": "Il mange de moins en moins de choses et les repas sont devenus une bataille. La pédiatre s'inquiète pour son poids. Il crie au bruit du sèche-cheveux et chez le coiffeur.",
            "Qu'attendez-vous de l'ergothérapie ?": "Qu'il accepte de goûter de nouveaux aliments et que les repas redeviennent calmes.",
          },
        },
      },
      {
        key: "evaluation",
        template: "evaluation",
        created: start,
        submitted: { at: at(start, "13:20"), by: "therapist" },
        answers: {
          "סיבת ההפניה": {
            "תאריך ההערכה": start,
            "גורם מפנה": ["הורים", "רופא/ת ילדים"],
            "סיבת ההפניה ותלונה עיקרית": "בררנות אכילה חמורה (כ-8 מזונות בלבד, סירוב לכל מרקם עם גושים) ותגובתיות יתר חושית. אבחנה של ASD לפני 4 חודשים.",
            "ציפיות ההורים מהטיפול": "הרחבת מגוון המזונות וארוחות רגועות יותר בבית.",
          },
          "רקע התפתחותי ורפואי": {
            "הריון ולידה ללא סיבוכים": true,
            "אבני דרך מוטוריות הושגו בזמן": true,
            "מצבים רפואיים, אבחנות ותרופות": "ASD. רפלוקס בשנה הראשונה. כפתורים באוזניים בגיל שנתיים וחצי. תוסף ברזל.",
            "טיפולים קודמים או נוכחיים": ["קלינאות תקשורת", "טיפול רגשי"],
          },
          "מוטוריקה עדינה": {
            "יד דומיננטית": ["לא נקבעה"],
            "אחיזת עיפרון": ["אגרופית"],
            "מיומנויות": { "גזירה במספריים": "קושי משמעותי", "העתקת צורות": "קושי בינוני", "השחלת חרוזים": "קושי קל", "כתיבה / ציור": "קושי בינוני" },
            "תצפיות נוספות": "נמנע ממגע בחומרים רטובים או דביקים (פלסטלינה, צבעי אצבעות), מנגב ידיים מיד.",
          },
          "מוטוריקה גסה": {
            "מיומנויות": { "שיווי משקל": "תקין", "קפיצה": "תקין", "תפיסה וזריקת כדור": "קושי קל", "טיפוס": "תקין", "תכנון תנועה": "קושי קל" },
            "טונוס שרירים": 3,
          },
          "עיבוד חושי": {
            "תגובות חושיות": { "מגע": "רגישות יתר", "שמיעה": "רגישות יתר", "ראייה": "תגובה תקינה", "תנועה (וסטיבולרי)": "חיפוש גירוי", "טעם וריח": "רגישות יתר" },
            "השפעת העיבוד החושי על התפקוד היומיומי": "רגישות יתר במגע, בשמיעה ובטעם/ריח המשפיעה על האכילה, הרחצה, צחצוח השיניים ותספורת. מחפש לחץ עמוק ותנועה.",
          },
          "ADL ועצמאות בטיפול עצמי": {
            "תחומים": { "לבוש": "תלוי/ה במבוגר", "אכילה": "זקוק/ה לעזרה חלקית", "רחצה": "תלוי/ה במבוגר", "שימוש בשירותים": "זקוק/ה לעזרה חלקית", "צחצוח שיניים": "תלוי/ה במבוגר" },
          },
          "גן / בית ספר ומשחק": {
            "מסגרת חינוכית וכיתה": "גן תקשורת, שנה ראשונה",
            "קשב והתמדה במשימה": 2,
            "סוגי משחק מועדפים": ["משחק תנועתי", "משחקי הרכבה"],
            "משחק עם בני גילו ותפקוד במסגרת": "משחק בעיקר לבד, מסדר רכבות בשורה. מעט משחק סמלי.",
          },
          "סיכום ומטרות": {
            "סיכום ההערכה": "ילד בן 3 ו-2 חודשים עם ASD, בררנות אכילה חמורה על רקע תגובתיות יתר חושית (מגע, טעם/ריח, שמיעה). מוטוריקה גסה תקינה.",
            "מטרות טיפול": "1. הרחבת רפרטואר המזונות (חשיפה הדרגתית במשחק). 2. הפחתת תגובתיות יתר במגע סביב הפה. 3. הדרכת הורים וצוות הגן.",
            "המלצה": ["טיפול בריפוי בעיסוק"],
          },
        },
      },
      {
        key: "eating-1",
        template: "eating_observation",
        created: wd(-375),
        submitted: { at: at(wd(-375), "14:30"), by: "therapist" },
        answers: {
          "הקשר הארוחה": { "תאריך התצפית": wd(-375), "מקום התצפית": ["גן / בית ספר"], "סוג הארוחה": ["ארוחת צהריים"], "נוכחים בארוחה": ["צוות הגן", "מטפל/ת"], "משך הארוחה": 25 },
          "ישיבה ויציבה": { "מקום הישיבה": ["כיסא רגיל ליד שולחן"], "כפות הרגליים נתמכות": false, "יציבות הגו במהלך הארוחה": 3, "הערות על היציבה": "רגליים באוויר, קם מהכיסא כל כמה דקות." },
          "כלים ואכילה עצמאית": { "כלים בשימוש": ["אצבעות", "כפית"], "רמת עצמאות באכילה": ["זקוק/ה לעזרה חלקית"], "יד מועדפת": ["לא נקבעה"], "אחיזת הכלים ושפיכה": "אוחז כפית באגרוף, נמנע מלגעת באוכל רטוב." },
          "מרקמים ומזונות": {
            "קבלת מרקמים": { "מחית חלקה": "מקבל/ת", "מחית עם גושים": "מסרב/ת", "מזון רך": "מקבל/ת בקושי", "מזון פריך": "מקבל/ת", "מזון לעיס (בשר)": "מסרב/ת", "נוזלים": "מקבל/ת" },
            "מזונות שהילד/ה אוכל/ת בהנאה": "במבה, פתי בר, לחם לבן בלי קרום, פסטה לבנה.",
            "מזונות שהילד/ה מסרב/ת להם": "אורז עם אפונה, עוף, ירקות מבושלים, כל פרי.",
          },
          "תפקוד אוראלי-מוטורי ותגובות חושיות": {
            "תגובות במהלך הארוחה": { "רפלקס הקאה": "לעיתים קרובות", "השתעלות": "לא נצפה", "החזקת אוכל בפה": "לעיתים", "הוצאת אוכל מהפה": "לעיתים קרובות", "ריור": "לא נצפה" },
            "יעילות הלעיסה": 2,
            "רגישות למגע סביב הפה": true,
            "תגובות חושיות נוספות (ריח, טמפרטורה, מראה המזון)": "רפלקס הקאה למראה ולריח של אורז מעורב. מעדיף מזון בטמפרטורת החדר.",
          },
          "התנהגות וסיכום": {
            "התנהגות במהלך הארוחה": ["קם/ה מהשולחן", "בכי / התנגדות"],
            "הנאה מהארוחה": 1,
            "כמות שנאכלה (הערכה)": "כרבע מנה (רק הלחם שהביא מהבית)",
            "סיכום התצפית": "בררנות אכילה משמעותית עם תגובתיות יתר לריחות ולמרקמים מעורבים. ישיבה לא יציבה ללא תמיכה לרגליים.",
            "המלצות": "הדום לרגליים, צלחת עם תאים, חשיפה במשחק ללא דרישה לטעום, הדרכת הצוות.",
          },
        },
      },
      {
        key: "eating-2",
        template: "eating_observation",
        created: wd(-34),
        submitted: { at: at(wd(-34), "13:10"), by: "therapist" },
        answers: {
          "הקשר הארוחה": { "תאריך התצפית": wd(-34), "מקום התצפית": ["קליניקה"], "סוג הארוחה": ["ארוחת ביניים"], "נוכחים בארוחה": ["אם", "מטפל/ת"], "משך הארוחה": 20 },
          "ישיבה ויציבה": { "מקום הישיבה": ["כיסא מותאם"], "כפות הרגליים נתמכות": true, "יציבות הגו במהלך הארוחה": 4 },
          "כלים ואכילה עצמאית": { "כלים בשימוש": ["אצבעות", "כפית", "מזלג"], "רמת עצמאות באכילה": ["אוכל/ת באופן עצמאי"], "יד מועדפת": ["ימין"] },
          "מרקמים ומזונות": {
            "קבלת מרקמים": { "מחית חלקה": "מקבל/ת", "מחית עם גושים": "מקבל/ת בקושי", "מזון רך": "מקבל/ת", "מזון פריך": "מקבל/ת", "מזון לעיס (בשר)": "מקבל/ת בקושי", "נוזלים": "מקבל/ת" },
            "מזונות שהילד/ה אוכל/ת בהנאה": "במבה, פסטה (גם עם רוטב בצד), שניצל עוף, פיתה, תפוח חתוך דק.",
            "מזונות שהילד/ה מסרב/ת להם": "ירקות מבושלים, דגים, ביצה.",
          },
          "תפקוד אוראלי-מוטורי ותגובות חושיות": {
            "תגובות במהלך הארוחה": { "רפלקס הקאה": "לעיתים", "השתעלות": "לא נצפה", "החזקת אוכל בפה": "לעיתים", "הוצאת אוכל מהפה": "לעיתים", "ריור": "לא נצפה" },
            "יעילות הלעיסה": 3,
            "רגישות למגע סביב הפה": true,
          },
          "התנהגות וסיכום": {
            "התנהגות במהלך הארוחה": ["רגוע/ה ושיתופי/ת", "משחק/ת באוכל"],
            "הנאה מהארוחה": 4,
            "כמות שנאכלה (הערכה)": "מנה שלמה של פסטה ושני ביסים של שניצל",
            "סיכום התצפית": "שיפור ברור: כ-15 מזונות מקובלים, טועם מזון חדש ביוזמתו, ארוחה רגועה ללא מסך. רפלקס הקאה פחות תכוף.",
            "המלצות": "להמשיך בחשיפה הדרגתית (ירקות מבושלים), להמשיך בצלחת עם תאים, להכניס ארוחה משפחתית אחת ביום ללא מסך.",
          },
        },
      },
      {
        key: "back-to-school",
        template: "backToSchool",
        cycle: "current",
        created: day(-40),
        sent: day(-40),
        submitted: { at: at(day(-31), "20:55"), by: "parent" },
        answers: {
          "Cette année": {
            "Classe et établissement": "Gan tikchoret « Rakefet », Netanya (2e année)",
            "Nom de l'enseignant(e) ou de la gannenet": "Orit",
            "Accompagnant(e) (sayaat) en classe": true,
            "Comment s'est passée la rentrée ?": 4,
          },
          "Depuis l'an dernier": {
            "Qu'est-ce qui a changé ?": "Il mange beaucoup plus de choses (poulet pané, pita, pommes). Il parle plus. Toujours très difficile chez le coiffeur et avec le bruit.",
            "Changement de traitement": false,
          },
          "Vos priorités": {
            "Sur quoi souhaitez-vous que l'on travaille cette année ?": "Les légumes, manger à la cantine du gan avec les autres, le brossage des dents.",
            "Créneaux possibles pour les séances": ["Lundi", "Mercredi"],
          },
        },
      },
    ],
    tests: [
      {
        key: "sp2-1",
        definition: sensoryProfile2Child,
        testDate: wd(-385),
        status: "completed",
        by: "parent",
        completedAfterDays: 4,
        answers: sp2Answers(
          "noam-sp2-1",
          { SK: 1.7, AV: 3.2, SN: 3.1, RG: 1.5, none: 2.5 },
          { 1: 5, 2: 5, 5: 4, 16: 5, 18: 4, 26: 1, 42: 4, 43: 5, 44: 5, 45: 5, 46: 5, 47: 5, 59: 4, 72: 5 },
          { oral: "Ne mange qu'une dizaine d'aliments, tous lisses ou très croquants.", auditory: "Sèche-cheveux, chasse d'eau, aspirateur : se bouche les oreilles." },
        ),
      },
      {
        key: "sp2-2",
        definition: sensoryProfile2Child,
        testDate: wd(-41),
        status: "completed",
        by: "parent",
        completedAfterDays: 3,
        answers: sp2Answers(
          "noam-sp2-2",
          { SK: 1.7, AV: 2.4, SN: 2.3, RG: 1.5, none: 2.2 },
          { 1: 5, 2: 4, 16: 4, 26: 1, 42: 4, 43: 3, 44: 4, 45: 4, 46: 4, 47: 4, 72: 4 },
          { oral: "Accepte maintenant le poulet pané, la pita et les pommes en lamelles." },
        ),
      },
    ],
    reports: [
      {
        key: "initial",
        docType: "initial_assessment",
        date: addDays(start, 0),
        forms: ["anamnesis", "evaluation"],
        notes: `bilan initial, garçon 3 ans 2 mois, TSA dg il y a 4 mois. Adressé par pédiatre + équipe du gan.
- parents : mange ~8 aliments (pâtes nature, riz blanc, pain de mie sans croûte, Bamba, Petit Beurre, yaourt nature, compote lisse, purée lisse). Refus de tout morceau. Haut-le-cœur à la vue/odeur de certains plats
- poids 10e p., suivi pédiatre, fer
- repas 45 min et +, mange devant écran sinon refuse
- oral : explore peu avec la bouche, brossage dents = crise
- tactile : refuse mains sales, pâte à modeler « beurk », s'essuie tout de suite
- auditif : oreilles bouchées sèche-cheveux, chasse d'eau, anniversaires
- recherche pression profonde : aime être serré fort, s'écrase dans les coussins
- MG ok. MF : prise palmaire, enfile 4 perles, évite matières
- jeu : aligne ses trains, peu de jeu symbolique
- SP2 remis aux parents
- à proposer : suivi hebdo, alimentation + régulation sensorielle, guidance parentale, échelle d'exposition, lien avec le gan`,
        variants: [
          {
            recipient: "parents",
            state: "exported",
            generated: [
              s("Ce que nous avons observé", "Merci pour votre confiance et pour le questionnaire très complet.\n\n{{child}} est un petit garçon souriant, qui aime beaucoup ses trains et les lettres. Il bouge bien : il court, grimpe et saute comme les enfants de son âge. Il tient encore le crayon dans le poing et évite de toucher les matières mouillées ou collantes."),
              s("Ce qui le met en difficulté", "{{child}} perçoit très fort les bruits, les odeurs, les goûts et certains contacts. C'est ce qui explique en grande partie les difficultés à table :\n- il mange environ 8 aliments, tous lisses ou très croquants\n- les morceaux et les mélanges provoquent des haut-le-cœur\n- les repas durent longtemps et se passent devant un écran\n\nLe brossage des dents, la coupe de cheveux et certains bruits (sèche-cheveux, chasse d'eau) sont aussi très difficiles pour lui. En revanche, il recherche les pressions fortes, qui l'apaisent."),
              s("Ce que nous allons faire ensemble", "- une séance par semaine, centrée sur l'alimentation et la régulation sensorielle\n- une échelle de découverte des aliments, sans jamais forcer à goûter\n- des rendez-vous réguliers avec vous pour adapter les repas à la maison\n- un lien avec l'équipe du gan"),
            ],
            edited: [
              s("Ce que nous avons observé", "Merci pour votre confiance et pour le questionnaire très complet.\n\n{{first}} est un petit garçon souriant, qui aime beaucoup ses trains et les lettres. Il bouge bien : il court, grimpe et saute comme les enfants de son âge. Il tient encore le crayon dans le poing et évite de toucher les matières mouillées ou collantes (pâte à modeler, peinture)."),
              s("Ce qui est difficile pour lui", "{{first}} perçoit très fort les bruits, les odeurs, les goûts et certains contacts. C'est ce qui explique en grande partie les difficultés à table :\n- il mange environ 8 aliments, tous lisses ou très croquants\n- les morceaux et les mélanges provoquent des haut-le-cœur\n- les repas durent longtemps et se passent devant un écran\n\nLe brossage des dents, la coupe de cheveux et certains bruits (sèche-cheveux, chasse d'eau) sont aussi très difficiles. Les pressions fortes, en revanche, l'apaisent : c'est un point d'appui précieux."),
              s("Ce que nous allons faire ensemble", "- une séance par semaine, centrée sur l'alimentation et la régulation sensorielle\n- une échelle de découverte des aliments : regarder, toucher, sentir, lécher, goûter… sans jamais forcer\n- un rendez-vous avec vous toutes les 6 semaines pour adapter les repas à la maison\n- un lien avec la gannenet et la sayaat\n\nLe questionnaire sensoriel (Profil sensoriel 2) est à me rapporter la semaine prochaine."),
            ],
          },
          {
            recipient: "doctor",
            state: "exported",
            generated: [
              s("Contexte", "Bilan initial en ergothérapie de {{child}}, 3 ans 2 mois, adressé par sa pédiatre et l'équipe du gan pour une sélectivité alimentaire sévère. TSA diagnostiqué il y a 4 mois. Poids au 10e percentile, supplémentation en fer."),
              s("Observations et résultats", "- Répertoire alimentaire d'environ 8 aliments, exclusivement lisses ou croquants ; refus de tout morceau, réflexe nauséeux à la vue et à l'odeur de certains plats\n- Hyper-réactivité tactile, auditive et olfacto-gustative ; recherche de pressions profondes\n- Motricité globale dans la norme ; préhension palmaire, évitement des matières\n- Repas prolongés (plus de 45 minutes), sous distraction par écran"),
              s("Recommandations", "Suivi hebdomadaire en ergothérapie axé sur l'alimentation (exposition progressive) et la régulation sensorielle, guidance parentale et coordination avec l'équipe du gan. Profil sensoriel 2 en cours. Poursuite de la surveillance pondérale par la pédiatre."),
            ],
          },
        ],
      },
      {
        key: "feeding-1",
        docType: "feeding_observation",
        date: wd(-375),
        forms: ["eating-1"],
        assessments: ["sp2-1"],
        notes: `observation repas au gan, 12h, déjeuner
- assis chaise standard, pieds dans le vide, se lève toutes les 3-4 min
- cuillère prise en poing, évite de toucher l'aliment avec les doigts
- riz + petits pois : haut-le-cœur à l'odeur, repousse
- ne mange que le pain de mie apporté de la maison (~1/4 portion)
- réflexe nauséeux fréquent, recrache les morceaux, mastication peu efficace
- SP2 (parents) : évitement et sensibilité « beaucoup plus que les autres », oral très élevé
- à proposer : repose-pieds, assiette à compartiments, exposition en jeu sans demande de goûter, formation sayaat`,
        variants: [
          {
            recipient: "parents",
            state: "exported",
            generated: [
              s("Ce qui avance", "Le repas s'est déroulé dans le calme au début : {{child}} est resté à table avec ses camarades et a mangé son pain de mie."),
              s("Ce qui reste difficile", "- Ses pieds ne touchent pas le sol, il est mal calé et se lève souvent\n- Le riz mélangé aux petits pois l'a dérangé dès l'odeur, avec des haut-le-cœur\n- Il évite de toucher les aliments et mâche encore peu efficacement\n\nLe questionnaire sensoriel que vous avez rempli confirme qu'il est beaucoup plus sensible que la plupart des enfants aux goûts, aux odeurs et aux textures."),
              s("À la maison cette semaine", "- un petit banc sous ses pieds pendant les repas\n- une assiette à compartiments pour que les aliments ne se touchent pas\n- des jeux avec les aliments (toucher, sentir, ranger) sans lui demander de goûter"),
            ],
          },
        ],
      },
      {
        key: "guidance",
        docType: "parent_guidance",
        date: wd(-150),
        notes: `rdv guidance parents (les deux présents)
- point sur l'échelle d'exposition : 4 nouveaux aliments acceptés (poulet pané léché, pita, pomme en lamelles, galette de maïs)
- repas du soir sans écran 3 soirs/semaine : ça tient
- difficile : le père le force parfois à « au moins goûter » → crises
- brossage : brosse vibrante ok le matin, toujours dur le soir
- coiffeur : coupe aux ciseaux à la maison devant dessin animé = réussie
- conseils : ne pas forcer, aliment « découverte » à côté de l'assiette, le laisser servir, décrire les aliments (couleur, bruit)
- prochain rdv dans 6 semaines`,
        variants: [
          {
            recipient: "parents",
            state: "validated",
            generated: [
              s("Ce qui avance", "Bravo pour tout le travail fait à la maison. {{child}} a accepté 4 nouveaux aliments sur l'échelle de découverte (poulet pané, pita, pomme en lamelles, galette de maïs). Les repas du soir sans écran, trois soirs par semaine, se passent bien. La coupe de cheveux aux ciseaux, à la maison, a réussi."),
              s("Ce qui reste difficile", "Quand on lui demande de goûter, {{child}} se met en crise. Le brossage des dents du soir reste difficile."),
              s("À la maison cette semaine", "- ne pas lui demander de goûter\n- poser l'aliment « découverte » à côté de son assiette\n- le laisser se servir lui-même\n- décrire les aliments avec lui : leur couleur, leur bruit quand on les croque"),
            ],
            edited: [
              s("Ce qui avance", "Bravo pour tout le travail fait à la maison ! {{first}} a accepté 4 nouveaux aliments sur l'échelle de découverte : poulet pané, pita, pomme en lamelles et galette de maïs. Les repas du soir sans écran, trois soirs par semaine, tiennent bien. Et la coupe de cheveux aux ciseaux, à la maison devant un dessin animé, a été une vraie réussite."),
              s("Ce qui reste difficile", "Quand on insiste pour qu'il « goûte au moins », {{first}} se sent débordé et la crise arrive : c'est normal, et c'est pour cela que nous avançons étape par étape. Le brossage des dents du soir reste un moment difficile, quand il est fatigué."),
              s("À la maison ces prochaines semaines", "- ne plus lui demander de goûter : il goûtera quand il sera prêt\n- poser l'aliment « découverte » à côté de son assiette, sans commentaire\n- le laisser se servir lui-même\n- jouer à décrire les aliments : leur couleur, leur odeur, leur bruit quand on les croque\n\nProchain rendez-vous dans 6 semaines."),
            ],
          },
        ],
      },
      {
        key: "feeding-2",
        docType: "feeding_observation",
        date: wd(-34),
        forms: ["eating-2"],
        assessments: ["sp2-2"],
        notes: `observation goûter au cabinet avec la mère
- chaise adaptée + repose-pieds : tronc stable, reste assis 20 min
- mange seul : doigts, cuillère, commence la fourchette (main droite)
- environ 15 aliments acceptés maintenant
- a goûté de lui-même un morceau de pita, sans demande
- réflexe nauséeux moins fréquent, mastication meilleure, encore lente sur la viande
- ambiance calme, pas d'écran, joue un peu avec la nourriture
- SP2 (parents) : sensibilité et évitement en baisse, oral encore « beaucoup plus que les autres »
- à proposer : continuer l'exposition (légumes cuits), un repas familial sans écran par jour, repas du gan avec les autres`,
        variants: [
          {
            recipient: "parents",
            state: "validated",
            generated: [
              s("Ce qui avance", "Les progrès de {{child}} sont très nets depuis le début du suivi :\n- il mange maintenant une quinzaine d'aliments\n- il a goûté un morceau de pita de lui-même, sans qu'on le lui demande\n- il est resté assis 20 minutes, bien calé sur sa chaise avec un appui sous les pieds\n- il mange seul, avec les doigts et la cuillère, et commence la fourchette\n\nLe questionnaire sensoriel montre aussi qu'il est un peu moins gêné par les sensations qu'il y a un an."),
              s("Ce qui reste difficile", "La bouche reste très sensible : les légumes cuits, le poisson et l'œuf sont encore refusés, et il mâche lentement la viande."),
              s("À la maison cette semaine", "- continuer la découverte en jeu, avec les légumes cuits\n- un repas en famille sans écran chaque jour\n- garder le repose-pieds et l'assiette à compartiments"),
            ],
          },
        ],
      },
      {
        key: "follow-up",
        docType: "follow_up",
        date: wd(-3),
        notes: `séance
- jeu de cuisine (pâte à sel) : a touché la pâte sans s'essuyer, 5 min
- brosse vibrante sur les joues puis dans la bouche : accepte, rit
- pita + houmous à côté : touche le houmous avec la pita, ne goûte pas
- crise courte au sèche-mains du couloir → casque, s'apaise en 3 min
- parents : 2 repas/jour sans écran, soirées plus calmes
- à proposer : continuer jeux de pâte, houmous sur l'échelle, casque à garder dans le sac`,
        variants: [
          {
            recipient: "parents",
            state: "draft",
            generated: [
              s("Ce qui avance", "Aujourd'hui, {{child}} a joué 5 minutes avec de la pâte à sel sans avoir besoin de s'essuyer les mains, ce qui est nouveau. Il a accepté la brosse vibrante sur les joues puis dans la bouche, en riant. Vous nous dites que deux repas par jour se passent maintenant sans écran, et que les soirées sont plus calmes."),
              s("Ce qui reste difficile", "Le bruit du sèche-mains dans le couloir a provoqué une courte crise ; avec le casque, il s'est apaisé en 3 minutes. Il a touché le houmous avec sa pita, sans le goûter."),
              s("À la maison cette semaine", "- des jeux avec de la pâte (pâte à sel, pâte à gâteau)\n- le houmous à côté de son assiette, pour le découvrir à son rythme\n- garder le casque dans son sac"),
            ],
          },
        ],
      },
    ],
    events: [
      { kind: "intake", date: start, time: "16:00", details: "Premier rendez-vous avec les deux parents, carnet de santé et menus de la semaine." },
      { kind: "report_due", date: day(-1), report: "follow-up", details: "Demandé par la pédiatre avant son rendez-vous de suivi." },
      { kind: "parent_guidance", date: wd(8), time: "17:30", details: "Point sur les repas à la maison : nouvelle texture introduite, chaise et repose-pieds." },
    ],
  };
}

// ---------------------------------------------------------------------------
// 2. Léa Attias — 7 years 4 months. Developmental coordination disorder (DCD) with
// handwriting difficulties (Hebrew print and cursive). Followed for 11 months.

function lea(): ChildSpec {
  const birth = addMonths(TODAY, -88, 22);
  const start = wd(-330);
  return {
    key: "lea",
    child: {
      name: "Léa Attias",
      birthDate: birth,
      referralReason: "Graphisme et écriture, maladresse motrice (TDC / dyspraxie)",
      schoolLevel: "Kita bet (CE1)",
      followUpStart: start,
      medicalHistory:
        "TDC (trouble développemental de la coordination) diagnostiqué par la neuropédiatre il y a 8 mois. Insuffisance de convergence légère, rééducation orthoptique terminée. Pas de traitement.",
      birthHistory: "Née à 38 SA, 2 900 g, sans complication.",
      familyHistory: "Père gaucher, « toujours eu une écriture illisible ». Pas d'autre antécédent connu.",
      familyComposition: "Vit avec ses parents et ses deux frères (10 ans et 3 ans).",
      siblingsCount: 2,
      otherInfo: "Bilingue français-hébreu, lit bien dans les deux langues. Écrit en hébreu à l'école (script puis cursive depuis cette année). Très bonne compréhension, vocabulaire riche.",
      knownTriggers: "Copie longue au tableau, dictées chronométrées, se sentir plus lente que les autres, lacets et boutons quand on est pressé le matin.",
      hyperSensitivities: ["clothing"],
      hypoReactivities: ["proprioception"],
      seeksDeepPressure: false,
      backgroundFactors: ["fatigue"],
      warningSigns: "Gomme sans arrêt, cache sa feuille avec son bras, dit « je suis nulle ».",
      calmingStrategies: ["break", "Découper la tâche en étapes", "Valoriser l'effort"],
      interests: ["drawing", "animals", "Danse"],
      createdAt: sqlTimestamp(at(addDays(start, -6), "10:00")),
    },
    episodes: [
      { at: [300, "19:30"], minutes: 25, kind: "difficulty", situation: "activity", antecedent: "Devoirs : copier 5 lignes en cursive", behavior: "Efface jusqu'à trouer la feuille, pleure", causes: ["tooDifficult", "frustration", "fatigue"], helped: ["break", "Découper la tâche en étapes"] },
      { at: [250, "07:30"], school: true, minutes: 15, kind: "difficulty", situation: "Habillage du matin", antecedent: "En retard, chaussures à lacets", behavior: "Se met en colère contre ses lacets, refuse de partir", causes: ["demand", "frustration", "lossOfControl"], helped: ["Chaussures à scratch les jours d'école", "Se lever 10 minutes plus tôt"] },
      { at: [190, "10:30"], school: true, minutes: 20, kind: "difficulty", situation: "activity", antecedent: "Dictée en temps limité", behavior: "Rend une feuille presque blanche, se cache dans sa capuche", causes: ["demand", "tooDifficult"], helped: ["Temps supplémentaire", "Dictée à trous"], notes: "Rapporté par la morah (enseignante)." },
      { at: [150, "15:50"], school: true, minutes: 12, kind: "crisis", antecedent: "Atelier bracelets de perles au tsaharon, les autres ont fini avant elle", behavior: "Jette les perles, crie « je suis nulle », pleure", causes: ["frustration", "tooDifficult"], helped: ["break", "Valoriser l'effort"] },
      { at: [95, "18:45"], minutes: 15, kind: "difficulty", situation: "activity", antecedent: "Découpage pour le spectacle de fin d'année", behavior: "Abandonne, demande à sa mère de le faire", causes: ["tooDifficult"], helped: ["Ciseaux à ressort", "Lignes de découpe épaissies"] },
      { at: [20, "12:40"], school: true, minutes: 10, kind: "difficulty", situation: "activity", antecedent: "Copie des devoirs au tableau en fin de cours", behavior: "Copie incomplète, oublie la moitié des devoirs", causes: ["tooDifficult", "demand"], helped: ["Photo du tableau par l'enseignante", "Agenda pré-rempli"], notes: "Signalé par la mère. Proposé de demander l'aménagement à l'école." },
    ],
    forms: [
      {
        key: "anamnesis",
        template: "anamnesis",
        created: day(-345),
        sent: day(-345),
        submitted: { at: at(day(-338), "22:10"), by: "parent" },
        answers: {
          "L'enfant": { "Nom et prénom de l'enfant": "Léa Attias", "Date de naissance": birth, "Langues parlées à la maison": ["Français", "Hébreu"] },
          "Grossesse et naissance": { "Terme à la naissance": 38, "Poids de naissance": 2900, "Hospitalisation en néonatologie": false },
          "Premières acquisitions": {
            "Tient assis(e) seul(e) (date approximative)": addMonths(birth, 8, 1),
            "Premiers pas (date approximative)": addMonths(birth, 16, 1),
            "Premiers mots (date approximative)": addMonths(birth, 11, 1),
            "Propreté de jour": ["Acquise"],
          },
          "Diagnostics et suivis": {
            "Suivis en cours ou passés": { pick: ["Orthoptie"], other: "Bilan neuropédiatrique prévu" },
            "Traitement médicamenteux": false,
          },
          "Vie quotidienne": {
            Sommeil: ["Bon"],
            "Alimentation : ce qu'il ou elle mange, ce qu'il ou elle refuse": "Mange de tout. Renverse souvent son verre, coupe difficilement sa viande.",
            Habillage: ["Avec un peu d'aide"],
            "Quelles sont vos principales inquiétudes ?": "Son écriture est très difficile à lire et elle est toujours la dernière à finir. Elle commence à dire qu'elle est nulle. Elle tombe souvent, n'arrive pas à faire du vélo sans petites roues.",
            "Qu'attendez-vous de l'ergothérapie ?": "Qu'elle écrive plus facilement et qu'elle reprenne confiance en elle.",
          },
        },
      },
      {
        key: "evaluation",
        template: "evaluation",
        created: start,
        submitted: { at: at(addDays(start, 1), "18:30"), by: "therapist" },
        answers: {
          "סיבת ההפניה": {
            "תאריך ההערכה": start,
            "גורם מפנה": ["הורים", "גננת / מורה"],
            "סיבת ההפניה ותלונה עיקרית": "כתב יד לא קריא ואיטי, עייפות בכתיבה, גמלוניות. מתחילה לבטא דימוי עצמי נמוך.",
            "ציפיות ההורים מהטיפול": "כתיבה קלה יותר וביטחון עצמי.",
          },
          "רקע התפתחותי ורפואי": {
            "הריון ולידה ללא סיבוכים": true,
            "אבני דרך מוטוריות הושגו בזמן": false,
            "מצבים רפואיים, אבחנות ותרופות": "אי-ספיקת התכנסות קלה (טופלה). הפניה לנוירולוגית לבירור DCD.",
            "טיפולים קודמים או נוכחיים": { pick: [], other: "אורטופטיקה" },
          },
          "מוטוריקה עדינה": {
            "יד דומיננטית": ["ימין"],
            "אחיזת עיפרון": { pick: [], other: "אחיזה לטרלית עם לחץ חזק" },
            "מיומנויות": { "גזירה במספריים": "קושי בינוני", "העתקת צורות": "קושי בינוני", "השחלת חרוזים": "קושי קל", "כתיבה / ציור": "קושי משמעותי" },
            "תצפיות נוספות": "כותבת לאט, לחץ חזק על העיפרון, אותיות בגדלים שונים, לא נשארת על השורה. מתעייפת אחרי כ-5 דקות.",
          },
          "מוטוריקה גסה": {
            "מיומנויות": { "שיווי משקל": "קושי בינוני", "קפיצה": "קושי קל", "תפיסה וזריקת כדור": "קושי בינוני", "טיפוס": "קושי קל", "תכנון תנועה": "קושי משמעותי" },
            "טונוס שרירים": 2,
            "תצפיות נוספות": "יציבות גו נמוכה בישיבה, נשענת על השולחן.",
          },
          "עיבוד חושי": {
            "תגובות חושיות": { "מגע": "רגישות יתר", "שמיעה": "תגובה תקינה", "ראייה": "תגובה תקינה", "תנועה (וסטיבולרי)": "תגובה תקינה", "טעם וריח": "תגובה תקינה" },
            "השפעת העיבוד החושי על התפקוד היומיומי": "מעט רגישות לתוויות ולגרביים. הקושי העיקרי מוטורי ולא חושי.",
          },
          "ADL ועצמאות בטיפול עצמי": {
            "תחומים": { "לבוש": "זקוק/ה לעזרה חלקית", "אכילה": "עצמאי/ת", "רחצה": "עצמאי/ת", "שימוש בשירותים": "עצמאי/ת", "צחצוח שיניים": "עצמאי/ת" },
            "הערות": "שרוכים וכפתורים קטנים קשים. חיתוך עם סכין קשה.",
          },
          "גן / בית ספר ומשחק": {
            "מסגרת חינוכית וכיתה": "בית ספר יסודי, כיתה א'",
            "קשב והתמדה במשימה": 4,
            "סוגי משחק מועדפים": ["משחק דמיוני", "משחקי קופסה"],
            "משחק עם בני גילו ותפקוד במסגרת": "חברותית, אהובה בכיתה. נמנעת ממשחקי כדור בהפסקה.",
          },
          "סיכום ומטרות": {
            "סיכום ההערכה": "תמונה התואמת חשד ל-DCD: קושי בתכנון תנועה, בכתיבה ובמיומנויות מוטוריות עדינות וגסות, עם השפעה על הדימוי העצמי.",
            "מטרות טיפול": "1. שיפור קריאות הכתב ומהירותו. 2. אחיזת עיפרון יעילה. 3. עצמאות בלבוש (שרוכים, כפתורים). 4. התאמות בכיתה.",
            "המלצה": ["טיפול בריפוי בעיסוק", "הפניה לגורם נוסף"],
          },
        },
      },
      { key: "back-to-school", template: "backToSchool", cycle: "current", created: day(-40), sent: day(-40) },
      { key: "teacher", template: "teacher", cycle: "current", created: day(-12), sent: day(-12) },
    ],
    tests: [
      {
        key: "sp2-1",
        definition: sensoryProfile2Child,
        testDate: wd(-322),
        status: "completed",
        by: "parent",
        completedAfterDays: 6,
        answers: sp2Answers(
          "lea-sp2-1",
          { SK: 1.5, AV: 1.5, SN: 1.7, RG: 1.4, none: 2 },
          { 17: 4, 33: 4, 34: 4, 36: 4, 37: 4, 38: 4, 54: 4, 66: 4, 68: 4 },
          { bodyPosition: "Se tient la tête dans les mains pour écrire, s'avachit vite.", socialEmotional: "Dit souvent qu'elle est nulle quand elle n'arrive pas." },
        ),
      },
      {
        key: "sp2-2",
        definition: sensoryProfile2Child,
        testDate: wd(-150),
        status: "completed",
        by: "parent",
        completedAfterDays: 4,
        answers: sp2Answers(
          "lea-sp2-2",
          { SK: 1.5, AV: 1.4, SN: 1.6, RG: 1.3, none: 1.9 },
          { 17: 4, 33: 3, 34: 4, 36: 3, 37: 3, 38: 4, 54: 3, 66: 4, 68: 3 },
          { bodyPosition: "Tient mieux assise avec le coussin, s'avachit encore en fin de journée.", socialEmotional: "Dit moins souvent qu'elle est nulle, surtout en dessin et en danse." },
        ),
      },
      { key: "sp2-3", definition: sensoryProfile2Child, testDate: wd(-5), status: "sent", answers: EMPTY_TEST },
    ],
    reports: [
      {
        key: "initial",
        docType: "initial_assessment",
        date: addDays(start, 8),
        forms: ["anamnesis", "evaluation"],
        tests: [
          { name: "BHK (échelle d'évaluation rapide de l'écriture)", results: "Qualité : 24 points (−2,1 DS). Vitesse : 61 caractères en 5 minutes (−1,6 DS)." },
          { name: "M-ABC-2", results: "Score total au 5e percentile (zone rouge). Dextérité manuelle 2e percentile, viser-attraper 9e, équilibre 16e." },
          { name: "Beery VMI", results: "VMI : note standard 84. Perception visuelle : 102. Coordination motrice : 78." },
        ],
        notes: `bilan initial, fille 6 ans 5 mois, kita alef
- plainte : écriture illisible et lente, toujours la dernière, « je suis nulle », chutes fréquentes, pas de vélo sans roulettes
- prise latérale du crayon, appui très fort, poignet en extension
- lettres de tailles variables, ne tient pas la ligne, fatigue après ~5 min
- BHK, M-ABC-2, VMI faits (voir résultats)
- habillage : lacets impossibles, petits boutons difficiles
- couteau : ne coupe pas la viande
- tronc peu stable assise, s'appuie sur le coude
- compréhension et vocabulaire excellents, très motivée en séance
- SP2 : enregistrement « plus que les autres » (position du corps), reste dans la norme ailleurs
- à proposer : suivi hebdo, adapter le crayon (grip), lignage renforcé, demande de temps supplémentaire, orienter vers neuropédiatre pour TDC`,
        variants: [
          {
            recipient: "parents",
            state: "exported",
            generated: [
              s("Ce que nous avons observé", "{{child}} est une petite fille vive, très motivée et qui comprend parfaitement ce qu'on lui demande. Son vocabulaire est riche, en français comme en hébreu.\n\nLes tests montrent en revanche des difficultés nettes dans la coordination des gestes : précision des mains, équilibre, attraper un ballon. Son écriture est lente et peu lisible : elle tient son crayon de côté, appuie très fort et se fatigue au bout de 5 minutes environ."),
              s("Ce qui reste difficile", "- écrire vite et lisiblement, rester sur la ligne\n- les lacets, les petits boutons, couper sa viande\n- rester bien assise longtemps : elle s'appuie sur son coude\n\nCes difficultés commencent à peser sur sa confiance en elle."),
              s("Ce que nous proposons", "- une séance d'ergothérapie par semaine\n- un embout sur le crayon et des cahiers à lignes renforcées\n- demander à l'école du temps supplémentaire pour les écrits\n- une consultation chez la neuropédiatre, pour faire le point sur ces difficultés de coordination"),
            ],
          },
          {
            recipient: "school",
            state: "exported",
            generated: [
              s("Contexte", "{{child}} est suivie en ergothérapie depuis ce mois-ci pour des difficultés de coordination motrice et d'écriture. Ses capacités de compréhension sont très bonnes."),
              s("Ce que vous pouvez observer en classe", "- une écriture lente, de taille irrégulière, qui sort des lignes\n- de la fatigue après quelques minutes d'écriture\n- une copie au tableau souvent incomplète\n- une posture affaissée, appuyée sur le coude\n- de la frustration quand elle finit après les autres"),
              s("Aménagements proposés en classe", "- du temps supplémentaire pour les écrits, ou une quantité réduite\n- des photocopies plutôt que la copie au tableau\n- un cahier à lignes renforcées et un embout sur le crayon\n- valoriser le contenu plutôt que la présentation"),
            ],
          },
        ],
      },
      {
        key: "follow-up",
        docType: "follow_up",
        date: wd(-170),
        notes: `séance (5 mois de suivi)
- grip triangulaire accepté, prise tripode plus stable, appui moins fort
- lettres script plus régulières sur lignage renforcé
- cursive commencée à l'école : liaisons difficiles
- lacets : boucle faite seule 2 fois sur 3 (méthode des « oreilles de lapin »)
- trampoline + parcours : meilleur équilibre, saute à cloche-pied 5 fois
- crise au tsaharon (bracelets de perles) rapportée par la mère
- à proposer : 10 min/jour de jeux de motricité fine, cursive lettre par lettre avec modèle animé, vélo draisienne`,
        variants: [
          {
            recipient: "parents",
            state: "validated",
            generated: [
              s("Ce qui avance", "{{child}} tient mieux son crayon depuis qu'elle utilise l'embout triangulaire, et elle appuie moins fort. Ses lettres en script sont plus régulières sur les cahiers à lignes renforcées. Elle fait seule la boucle de ses lacets deux fois sur trois, et son équilibre progresse : elle saute 5 fois à cloche-pied."),
              s("Ce qui reste difficile", "L'écriture cursive, commencée à l'école, lui demande beaucoup d'effort, surtout pour relier les lettres. Les activités de précision en groupe, comme au tsaharon, peuvent encore la mettre en échec."),
              s("À la maison cette semaine", "- 10 minutes par jour de jeux de doigts (pâte à modeler, pinces, perles)\n- la cursive lettre par lettre, en regardant un modèle animé\n- la draisienne pour l'équilibre"),
            ],
            edited: [
              s("Ce qui avance", "{{first}} tient mieux son crayon depuis qu'elle utilise l'embout triangulaire, et elle appuie moins fort : sa main se fatigue moins vite. Ses lettres en script sont plus régulières sur les cahiers à lignes renforcées. Elle fait seule la boucle de ses lacets deux fois sur trois (la méthode des « oreilles de lapin » lui plaît beaucoup), et son équilibre progresse : elle saute 5 fois à cloche-pied."),
              s("Ce qui reste difficile", "L'écriture cursive, commencée à l'école, lui demande beaucoup d'effort, surtout pour relier les lettres entre elles. Les activités de précision en groupe, comme les perles au tsaharon, peuvent encore la mettre en échec et la faire douter d'elle : n'hésitez pas à lui rappeler tout ce qu'elle a déjà appris à faire."),
              s("À la maison cette semaine", "- 10 minutes par jour de jeux de doigts (pâte à modeler, pinces à linge, perles)\n- la cursive lettre par lettre, en regardant d'abord le modèle animé\n- la draisienne au parc, pour l'équilibre"),
            ],
          },
        ],
      },
      {
        key: "year-end",
        docType: "year_end_summary",
        date: wd(-100),
        // Written at the end of the school year, validated after the summer break.
        validatedAfterDays: 50,
        assessments: ["sp2-1"],
        tests: [{ name: "BHK (retest)", results: "Qualité : 17 points (−0,9 DS). Vitesse : 112 caractères en 5 minutes (−0,8 DS)." }],
        notes: `bilan fin d'année
- BHK retest : qualité et vitesse nettement améliorées, dans la zone limite
- tripode stable avec grip, cursive hébraïque lisible sur 10 lignes
- lacets ok, boutons ok, couteau : coupe les aliments mous
- vélo sans roulettes depuis avril !
- neuropédiatre : TDC confirmé
- aménagements obtenus : temps sup + photocopies
- confiance : dit « j'ai réussi » plus souvent
- l'an prochain : suivi tous les 15 jours, travail de la vitesse et de l'organisation (cartable, agenda), clavier à partir du CE2 à discuter`,
        variants: [
          {
            recipient: "parents",
            state: "exported",
            generated: [
              s("Ce qui avance", "Cette année, {{child}} a fait de très beaux progrès :\n- son écriture est plus lisible et plus rapide : les résultats au test d'écriture se rapprochent de ceux des enfants de son âge\n- elle écrit 10 lignes en cursive lisible\n- elle fait ses lacets et ses boutons seule\n- elle roule à vélo sans roulettes depuis avril\n\nLes aménagements obtenus à l'école (temps supplémentaire, photocopies) l'aident beaucoup, et elle dit plus souvent « j'ai réussi »."),
              s("Ce qui reste difficile", "La vitesse d'écriture reste un peu en dessous de celle de sa classe, et l'organisation de son matériel lui demande encore de l'aide. La neuropédiatre a confirmé le trouble de la coordination (TDC)."),
              s("Pour l'an prochain", "- une séance tous les 15 jours\n- travailler la vitesse d'écriture et l'organisation (cartable, agenda)\n- réfléchir ensemble à l'usage du clavier à partir du CE2"),
            ],
          },
        ],
      },
      {
        key: "year-start",
        docType: "year_start_summary",
        date: wd(-4),
        notes: `rentrée kita bet
- nouvelle enseignante, prévenue des aménagements (à vérifier)
- copie des devoirs incomplète depuis la rentrée (signalé par la mère)
- cursive : maintenue pendant l'été, 8 lignes lisibles
- questionnaire enseignant envoyé, pas encore revenu
- SP2 de réévaluation envoyé aux parents
- objectifs de l'année : vitesse, agenda, autonomie cartable, clavier ?`,
        variants: [],
      },
    ],
    events: [
      { kind: "intake", date: start, time: "15:00" },
      { kind: "report_due", date: day(6), report: "year-start", details: "Pour l'équipe éducative." },
      { kind: "other", date: wd(3), time: "08:15", details: "Réunion de l'équipe éducative à l'école\nApporter le bilan de début d'année et les adaptations proposées pour l'écriture." },
    ],
  };
}

// ---------------------------------------------------------------------------
// 3. Ethan Cohen-Sabbah — 9 years 7 months. ADHD with sensory seeking; frequent crises
// at school transitions (end of break, lunch queue). Followed for 2 years.

function ethan(): ChildSpec {
  const birth = addMonths(TODAY, -115, 8);
  const start = wd(-730);
  const diagnosis = addMonths(birth, 86, 12);
  return {
    key: "ethan",
    child: {
      name: "Ethan Cohen-Sabbah",
      birthDate: birth,
      referralReason: "Régulation sensorielle et comportementale (TDAH), crises aux transitions",
      schoolLevel: "Kita dalet (CM1)",
      followUpStart: start,
      medicalHistory:
        "TDAH diagnostiqué à 7 ans (neuropédiatre). Méthylphénidate à libération prolongée le matin depuis 1 an (effet jusqu'à 15h environ). Asthme léger d'effort, Ventolin si besoin.",
      birthHistory: "Né à 40 SA, 3 600 g, sans complication.",
      surgicalHistory: "Fracture du poignet gauche à 6 ans (chute de trampoline).",
      familyHistory: "Père et oncle paternel : TDAH diagnostiqué à l'âge adulte.",
      familyComposition: "Parents séparés, garde alternée (une semaine sur deux). Une demi-sœur de 2 ans chez sa mère.",
      siblingsCount: 1,
      otherInfo: "Psychologue en libéral toutes les deux semaines. Assistante de classe partagée. Très bon niveau en maths. Joue au football le lundi.",
      knownTriggers: "Fin de récréation (surtout s'il est en plein jeu), file d'attente de la cantine, cour bondée et bruyante, changement d'enseignant ou de salle, devoirs en fin de journée quand le traitement ne fait plus effet.",
      hyperSensitivities: ["noise"],
      hypoReactivities: ["proprioception", "pain"],
      seeksDeepPressure: true,
      backgroundFactors: ["hunger", "fatigue", "sleep"],
      warningSigns: "Parle de plus en plus fort, se balance sur sa chaise, tape du pied, cherche le contact physique avec les autres.",
      calmingStrategies: ["deepPressure", "break", "Travail lourd (porter la caisse de livres)", "Tour de cour en courant", "Minuteur visuel"],
      interests: ["Football", "Lego Technic", "space"],
      createdAt: sqlTimestamp(at(addDays(start, -10), "11:30")),
    },
    episodes: [
      { at: [715, "11:50"], school: true, minutes: 20, kind: "crisis", antecedent: "Fin de la grande récréation, la sonnerie retentit", behavior: "Refuse de rentrer, s'accroche au grillage, crie", causes: ["transition", "noise", "lossOfControl"], helped: ["break", "Tour de cour en courant"] },
      { at: [690, "12:20"], school: true, minutes: 15, kind: "crisis", antecedent: "File d'attente à la cantine, bousculade", behavior: "Pousse un camarade, renverse un plateau", causes: ["waiting", "crowd", "noise", "hunger"], helped: ["quietCorner", "Passer en premier, hors de la file"] },
      { at: [650, "08:10"], school: true, minutes: 10, kind: "difficulty", situation: "transition", antecedent: "Arrivée en classe après le trajet en bus", behavior: "Court dans le couloir, ne s'installe pas", causes: ["transition", "seeksPressure"], helped: ["Travail lourd (porter la caisse de livres)"] },
      { at: [610, "11:45"], school: true, minutes: 25, kind: "crisis", antecedent: "Fin de récréation, partie de foot interrompue", behavior: "Lance le ballon contre la porte, insulte le professeur de sport", causes: ["transition", "frustration", "lossOfControl"], helped: ["Minuteur visuel", "deepPressure"], notes: "Mise en place du minuteur visuel 5 min avant la fin de la récré, avec l'assistante." },
      { at: [560, "19:40"], minutes: 20, kind: "crisis", antecedent: "Arrêt de la tablette, chez son père", behavior: "Crie, claque la porte de sa chambre, jette ses coussins", causes: ["transition", "lossOfControl", "fatigue"], helped: ["Prévenir 10 puis 2 minutes avant", "Trampoline 5 minutes"] },
      { at: [520, "12:30"], school: true, minutes: 18, kind: "crisis", antecedent: "Retour de récréation avec changement de salle (cours d'anglais)", behavior: "Se roule par terre dans le couloir", causes: ["transition", "routineChange"], helped: ["deepPressure", "Travail lourd (porter la caisse de livres)"] },
      { at: [470, "15:40"], school: true, minutes: 30, kind: "difficulty", situation: "activity", antecedent: "Bricolage assis au tsaharon", behavior: "Se lève sans arrêt, dérange les autres", causes: ["demand", "seeksPressure", "fatigue"], helped: ["Coussin dynamique", "break"] },
      { at: [430, "11:55"], school: true, minutes: 12, kind: "crisis", antecedent: "Fin de récréation, il vient de perdre aux billes", behavior: "Pleurs de rage, frappe le mur", causes: ["transition", "frustration"], helped: ["Tour de cour en courant", "quietCorner"] },
      { at: [400, "12:15"], school: true, minutes: 8, kind: "difficulty", situation: "transition", antecedent: "Rangement avant le repas", behavior: "Refuse de ranger, jette les feutres", causes: ["transition", "hunger"], helped: ["Minuteur visuel", "Rôle de responsable du rangement"] },
      { at: [330, "11:50"], school: true, minutes: 20, kind: "crisis", antecedent: "Pluie : récréation annulée, reste en classe", behavior: "Opposition, renverse sa chaise", causes: ["routineChange", "transition", "seeksPressure"], helped: ["Pause mouvement (pompes contre le mur)", "deepPressure"] },
      { at: [290, "08:05"], school: true, minutes: 10, kind: "difficulty", situation: "transition", antecedent: "Retour à l'école après les vacances de Hanoukka", behavior: "Tourne dans la classe, ne sort pas ses affaires", causes: ["routineChange", "sleep"], helped: ["Travail lourd (porter la caisse de livres)"] },
      { at: [250, "12:05"], school: true, minutes: 15, kind: "crisis", antecedent: "Fin de récréation, conflit avec un camarade", behavior: "Bouscule, refuse de rentrer", causes: ["transition", "frustration", "hunger"], helped: ["quietCorner", "Tour de cour en courant"] },
      { at: [105, "13:00"], school: true, minutes: 25, kind: "crisis", antecedent: "Sortie de fin d'année, attente du bus en plein soleil", behavior: "S'enfuit de la file, court vers la route", causes: ["waiting", "crowd", "fatigue"], helped: ["Mission : porter le sac de ballons"], notes: "Mise en danger : prévoir une mission et un adulte référent pour chaque sortie." },
      { at: [140, "19:30"], minutes: 30, kind: "difficulty", situation: "activity", antecedent: "Devoirs de maths le soir", behavior: "Se lève 15 fois, finit sous la table", causes: ["demand", "fatigue"], helped: ["Devoirs assis sur un ballon", "Séquences de 10 minutes + 2 minutes de pause"] },
      { at: [30, "11:45"], school: true, minutes: 20, kind: "crisis", antecedent: "Semaine de la rentrée, fin de récréation, nouvel enseignant", behavior: "Refuse de rentrer, crie qu'il veut l'ancienne maîtresse", causes: ["transition", "personChange", "routineChange"], helped: ["deepPressure", "Tour de cour en courant"] },
      { at: [26, "12:10"], school: true, minutes: 12, kind: "crisis", antecedent: "Retour de récréation, couloir très bruyant", behavior: "Crie, tape des pieds, refuse d'entrer en classe", causes: ["transition", "noise"], helped: ["Pause mouvement (pompes contre le mur)", "break"] },
      { at: [20, "15:30"], school: true, minutes: 20, kind: "difficulty", situation: "activity", antecedent: "Activité de groupe au tsaharon, fin d'effet du traitement", behavior: "S'agite, coupe la parole, quitte le groupe", causes: ["fatigue", "demand", "hunger"], helped: ["Collation protéinée à 15h", "break"] },
      { at: [17, "11:50"], school: true, minutes: 15, kind: "crisis", antecedent: "Fin de récréation, cour bondée (deux classes)", behavior: "Bouscule dans le rang, refuse d'avancer", causes: ["transition", "crowd", "noise"], helped: ["Minuteur visuel", "Pause mouvement (pompes contre le mur)"] },
      { at: [13, "12:20"], school: true, minutes: 10, kind: "crisis", antecedent: "File d'attente de la cantine", behavior: "Double tout le monde, crie quand on le remet à sa place", causes: ["waiting", "hunger", "crowd"], helped: ["Passer en premier, hors de la file"] },
      { at: [10, "11:45"], school: true, minutes: 9, kind: "crisis", antecedent: "Fin de récréation", behavior: "Refuse de rentrer, lance des cailloux", causes: ["transition", "lossOfControl"], helped: ["Minuteur visuel", "Tour de cour en courant"], notes: "Première fois qu'il demande lui-même à faire son tour de cour. 4 minutes, puis rentre seul." },
      { at: [7, "08:10"], school: true, minutes: 8, kind: "difficulty", situation: "transition", antecedent: "Arrivée en classe, cartable oublié chez sa mère", behavior: "Se met en colère, refuse de s'asseoir", causes: ["routineChange", "frustration"], helped: ["Travail lourd (porter la caisse de livres)"] },
      { at: [3, "11:55"], school: true, minutes: 6, kind: "crisis", antecedent: "La cloche sonne en plein jeu", behavior: "Crie, donne un coup de pied dans le ballon", causes: ["transition", "frustration"], helped: ["Minuteur visuel", "Tour de cour en courant"], notes: "Crise courte (6 min). L'assistante a utilisé la carte « j'ai besoin de bouger »." },
      { at: [2, "12:15"], school: true, minutes: 5, kind: "difficulty", situation: "transition", antecedent: "Passage de la récréation à la classe", behavior: "Tarde à rentrer, mais rentre seul après son tour de cour", causes: ["transition"], helped: ["Tour de cour en courant"] },
    ],
    forms: [
      {
        key: "anamnesis",
        template: "anamnesis",
        created: day(-745),
        sent: day(-745),
        submitted: { at: at(day(-737), "21:00"), by: "parent" },
        answers: {
          "L'enfant": { "Nom et prénom de l'enfant": "Ethan Cohen-Sabbah", "Date de naissance": birth, "Langues parlées à la maison": ["Français", "Hébreu"] },
          "Grossesse et naissance": { "Terme à la naissance": 40, "Poids de naissance": 3600, "Hospitalisation en néonatologie": false },
          "Premières acquisitions": {
            "Tient assis(e) seul(e) (date approximative)": addMonths(birth, 6, 1),
            "Premiers pas (date approximative)": addMonths(birth, 10, 15),
            "Premiers mots (date approximative)": addMonths(birth, 12, 1),
            "Propreté de jour": ["Acquise"],
          },
          "Diagnostics et suivis": {
            "Diagnostic(s) posé(s)": "TDAH",
            "Date du diagnostic": diagnosis,
            "Posé par": "Neuropédiatre",
            "Suivis en cours ou passés": ["Psychologue", "Neuropédiatre"],
            "Dernière consultation chez le neuropédiatre": day(-760),
            "Traitement médicamenteux": false,
          },
          "Vie quotidienne": {
            Sommeil: ["Endormissement difficile"],
            "Alimentation : ce qu'il ou elle mange, ce qu'il ou elle refuse": "Mange de tout, très vite, souvent debout.",
            Habillage: ["Seul(e)"],
            "Quelles sont vos principales inquiétudes ?": "Les crises à l'école, surtout après la récréation : l'école nous appelle presque toutes les semaines. Il ne tient pas en place et se met en danger.",
            "Qu'attendez-vous de l'ergothérapie ?": "Des outils pour qu'il se calme plus vite, à l'école et à la maison.",
          },
        },
      },
      {
        key: "evaluation",
        template: "evaluation",
        created: start,
        submitted: { at: at(start, "17:45"), by: "therapist" },
        answers: {
          "סיבת ההפניה": {
            "תאריך ההערכה": start,
            "גורם מפנה": ["הורים", "גננת / מורה"],
            "סיבת ההפניה ותלונה עיקרית": "התפרצויות חוזרות במעברים בבית הספר (סוף הפסקה, תור לחדר האוכל), חיפוש תנועה ומגע, קושי לשבת לאורך זמן. אבחנה של ADHD.",
            "ציפיות ההורים מהטיפול": "כלים לוויסות ופחות התפרצויות בבית הספר.",
          },
          "רקע התפתחותי ורפואי": {
            "הריון ולידה ללא סיבוכים": true,
            "אבני דרך מוטוריות הושגו בזמן": true,
            "מצבים רפואיים, אבחנות ותרופות": "ADHD. אסטמה קלה במאמץ. שבר בשורש כף היד בגיל 6.",
            "טיפולים קודמים או נוכחיים": ["טיפול רגשי"],
          },
          "מוטוריקה עדינה": {
            "יד דומיננטית": ["ימין"],
            "אחיזת עיפרון": ["שלוש אצבעות בוגרת"],
            "מיומנויות": { "גזירה במספריים": "תקין", "העתקת צורות": "קושי קל", "השחלת חרוזים": "תקין", "כתיבה / ציור": "קושי קל" },
            "תצפיות נוספות": "כותב מהר ובלחץ חזק, מדלג על שורות.",
          },
          "מוטוריקה גסה": {
            "מיומנויות": { "שיווי משקל": "תקין", "קפיצה": "תקין", "תפיסה וזריקת כדור": "תקין", "טיפוס": "תקין", "תכנון תנועה": "תקין" },
            "טונוס שרירים": 3,
            "תצפיות נוספות": "לוקח סיכונים בטיפוס, קופץ מגובה.",
          },
          "עיבוד חושי": {
            "תגובות חושיות": { "מגע": "חיפוש גירוי", "שמיעה": "רגישות יתר", "ראייה": "תגובה תקינה", "תנועה (וסטיבולרי)": "חיפוש גירוי", "טעם וריח": "תגובה תקינה" },
            "השפעת העיבוד החושי על התפקוד היומיומי": "חיפוש תנועה ולחץ עמוק ניכר; רגישות לרעש בחצר ובמסדרון. ההתפרצויות מופיעות בעיקר במעברים.",
          },
          "ADL ועצמאות בטיפול עצמי": {
            "תחומים": { "לבוש": "עצמאי/ת", "אכילה": "עצמאי/ת", "רחצה": "עצמאי/ת", "שימוש בשירותים": "עצמאי/ת", "צחצוח שיניים": "זקוק/ה לעזרה חלקית" },
          },
          "גן / בית ספר ומשחק": {
            "מסגרת חינוכית וכיתה": "בית ספר יסודי, כיתה ב'",
            "קשב והתמדה במשימה": 2,
            "סוגי משחק מועדפים": ["משחק תנועתי", "משחקי הרכבה"],
            "משחק עם בני גילו ותפקוד במסגרת": "מבוקש במשחקי כדור, אך מתעמת בקלות כשהמשחק נקטע.",
          },
          "סיכום ומטרות": {
            "סיכום ההערכה": "ילד עם ADHD ופרופיל של חיפוש חושי (תנועה, מגע, לחץ עמוק) ורגישות לרעש. ההתפרצויות קשורות בעיקר למעברים ולהמתנה.",
            "מטרות טיפול": "1. תוכנית ויסות חושי (דיאטה חושית) בבית הספר ובבית. 2. היערכות למעברים (טיימר, עבודה כבדה). 3. הדרכת הצוות וההורים.",
            "המלצה": ["טיפול בריפוי בעיסוק"],
          },
        },
      },
      {
        key: "back-to-school",
        template: "backToSchool",
        cycle: "current",
        created: day(-40),
        sent: day(-40),
        submitted: { at: at(day(-35), "22:30"), by: "parent" },
        answers: {
          "Cette année": {
            "Classe et établissement": "Kita dalet, école Ben-Tsvi, Netanya",
            "Nom de l'enseignant(e) ou de la gannenet": "Yaron",
            "Accompagnant(e) (sayaat) en classe": true,
            "Comment s'est passée la rentrée ?": 2,
          },
          "Depuis l'an dernier": {
            "Qu'est-ce qui a changé ?": "Nouvel enseignant (un homme, très cadrant). Ethan a eu plusieurs crises la première semaine mais il utilise de plus en plus son « tour de cour ».",
            "Changement de traitement": true,
          },
          "Vos priorités": {
            "Sur quoi souhaitez-vous que l'on travaille cette année ?": "Les fins de récréation et la cantine. Les devoirs le soir chez chacun de nous.",
            "Créneaux possibles pour les séances": ["Dimanche", "Mardi"],
          },
        },
      },
      {
        key: "teacher-previous",
        template: "teacher",
        cycle: "previous",
        created: day(-375),
        sent: day(-375),
        submitted: { at: at(day(-368), "16:20"), by: "parent" },
        answers: {
          Classe: { Classe: "Kita gimel", "Date de remplissage": day(-369) },
          "En classe": {
            "Au quotidien, l'élève…": {
              "Reste assis(e) pendant une activité": "Parfois",
              "Termine un travail écrit dans le temps donné": "Souvent",
              "Copie au tableau sans erreur": "Parfois",
              "Organise son matériel": "Jamais",
              "Gère les transitions (fin de récréation, changement d'activité)": "Jamais",
              "Participe aux activités de groupe": "Souvent",
            },
            "Lisibilité de l'écriture": 3,
            "Aménagements déjà en place": ["Place près du tableau", "Pauses de mouvement"],
          },
          Observations: {
            "Points forts de l'élève": "Très bon en calcul mental, généreux, apprécié des autres.",
            "Difficultés observées": "Les retours de récréation sont très difficiles (crise environ une fois par semaine). S'agite après 15 minutes d'activité assise.",
            "Questions pour l'ergothérapeute": "Que faire concrètement au moment de la sonnerie ?",
          },
        },
      },
      { key: "teacher", template: "teacher", cycle: "current", created: day(-12), sent: day(-12) },
    ],
    tests: [
      {
        key: "sp2-1",
        definition: sensoryProfile2Child,
        testDate: wd(-728),
        status: "completed",
        by: "parent",
        completedAfterDays: 5,
        answers: sp2Answers(
          "ethan-sp2-1",
          { SK: 3.4, AV: 2.3, SN: 2.3, RG: 1.6, none: 2.5 },
          { 1: 4, 4: 5, 21: 5, 22: 4, 25: 5, 27: 5, 28: 5, 30: 5, 31: 5, 32: 4, 55: 5, 56: 5, 59: 4, 68: 4, 70: 5, 77: 5, 83: 5 },
          { movement: "Ne tient pas en place, grimpe partout, saute des meubles.", conduct: "Crises surtout aux fins de récréation selon l'école." },
        ),
      },
      {
        key: "sp2-2",
        definition: sensoryProfile2Child,
        testDate: wd(-380),
        status: "completed",
        by: "therapist",
        completedAfterDays: 0,
        answers: sp2Answers(
          "ethan-sp2-2",
          { SK: 2.2, AV: 1.8, SN: 1.9, RG: 1.5, none: 2.2 },
          { 4: 4, 21: 4, 25: 4, 27: 4, 28: 4, 31: 4, 55: 4, 56: 4, 70: 4, 77: 4, 83: 4 },
          { movement: "Utilise ses pauses mouvement, moins de prises de risque." },
        ),
      },
    ],
    reports: [
      {
        key: "initial",
        docType: "initial_assessment",
        date: addDays(start, 10),
        forms: ["anamnesis", "evaluation"],
        assessments: ["sp2-1"],
        notes: `bilan initial, garçon 7 ans 7 mois, kita bet, TDAH dg il y a 6 mois, pas de traitement pour l'instant
- école : crises ~1×/semaine, surtout fins de récré et file de cantine
- cherche le mouvement en permanence, grimpe, saute des meubles, se cogne sans se plaindre
- recherche de pression : se jette sur les autres, serre fort
- bruit de la cour et du couloir : se bouche les oreilles puis s'agite
- écriture rapide, appui fort, saute des lignes ; prise tripode ok
- motricité globale très bonne, prise de risques
- SP2 (parents) : recherche « beaucoup plus que les autres », comportement/attention élevés
- à proposer : suivi hebdo, programme sensoriel (« diète sensorielle ») école + maison, préparation des transitions (minuteur, travail lourd), lien avec l'école`,
        variants: [
          {
            recipient: "parents",
            state: "exported",
            generated: [
              s("Ce que nous avons observé", "{{child}} est un garçon plein d'énergie, très habile physiquement et attachant. Il a besoin de bouger beaucoup plus que les autres enfants : il grimpe, saute, cherche les contacts forts. Le questionnaire que vous avez rempli le confirme : il recherche les sensations beaucoup plus que la plupart des enfants de son âge."),
              s("Ce qui reste difficile", "Les crises arrivent surtout aux moments de passage : la fin de la récréation et l'attente à la cantine. Le bruit de la cour et du couloir semble aussi le déborder. Son écriture est rapide, avec un appui très fort."),
              s("Ce que nous proposons", "- une séance par semaine\n- un programme de mouvements et de pressions à faire dans la journée, à l'école et à la maison\n- préparer les fins de récréation avec un minuteur et une « mission » physique (porter des livres, par exemple)\n- un échange avec l'équipe de l'école"),
            ],
          },
          {
            recipient: "doctor",
            state: "exported",
            generated: [
              s("Contexte", "Bilan initial en ergothérapie de {{child}}, 7 ans 7 mois, TDAH diagnostiqué il y a 6 mois, sans traitement à ce jour. Motif : crises répétées en milieu scolaire et agitation motrice."),
              s("Observations et résultats", "- Profil sensoriel 2 (questionnaire parents) : quadrant Recherche « beaucoup plus que les autres » ; sections comportement et attention élevées\n- Recherche vestibulaire et proprioceptive marquée, hyporéactivité à la douleur, hyper-réactivité auditive\n- Crises concentrées sur les transitions scolaires (fin de récréation, file de cantine)\n- Motricité globale de bon niveau, conduites à risque ; graphisme rapide avec appui excessif"),
              s("Recommandations", "Suivi hebdomadaire en ergothérapie : programme sensoriel intégré à la journée, préparation des transitions, guidance parentale et coordination avec l'école."),
            ],
          },
          {
            recipient: "school",
            state: "exported",
            generated: [
              s("Contexte", "{{child}} commence un suivi en ergothérapie. Il a un besoin important de mouvement et de pressions fortes pour rester disponible, et il est vite débordé par le bruit."),
              s("Ce que vous pouvez observer en classe", "- de l'agitation après 15 minutes d'activité assise\n- des difficultés au moment de rentrer de récréation ou d'attendre dans une file\n- une montée en tension visible : il parle plus fort, se balance, tape du pied"),
              s("Aménagements proposés en classe", "- prévenir 5 minutes avant la fin de la récréation (minuteur visuel)\n- lui confier une mission physique au retour : porter la caisse de livres, distribuer les cahiers\n- le faire passer en premier ou hors de la file à la cantine\n- une pause mouvement possible (pompes contre le mur) sur un signal convenu"),
            ],
          },
        ],
      },
      {
        key: "recommendations",
        docType: "recommendations",
        date: wd(-670),
        notes: `réunion école (enseignante, assistante, conseillère)
- crises toujours en fin de récré : minuteur visuel testé 2 semaines = moins de crises quand il est utilisé
- carte « j'ai besoin de bouger » proposée
- coin calme en classe avec coussin lourd
- file cantine : le faire passer en premier
- coussin dynamique sur la chaise
- à formaliser par écrit pour l'équipe`,
        variants: [
          {
            recipient: "school",
            state: "exported",
            generated: [
              s("Contexte", "Suite à notre réunion, voici les adaptations convenues ensemble pour {{child}}. Le minuteur visuel testé ces deux dernières semaines a déjà réduit les crises de fin de récréation lorsqu'il était utilisé."),
              s("Aménagements proposés en classe", "- minuteur visuel 5 minutes avant la sonnerie, montré par l'assistante\n- une carte « j'ai besoin de bouger » qu'il peut poser sur la table\n- un coin calme dans la classe, avec un coussin lourd\n- passer en premier à la cantine\n- un coussin dynamique sur sa chaise"),
            ],
          },
        ],
      },
      {
        key: "year-end",
        docType: "year_end_summary",
        date: wd(-465),
        notes: `fin d'année kita bet
- crises : de ~1/semaine à ~1 toutes les 2-3 semaines
- utilise la carte « bouger » 2-3×/jour
- minuteur utilisé systématiquement par l'assistante
- toujours difficile : sorties scolaires, remplaçants
- traitement débuté il y a 1 mois (neuropédiatre), plus disponible le matin
- l'an prochain : poursuite hebdo, travail de l'auto-régulation (« moteur » : vitesse lente/moyenne/rapide)`,
        variants: [
          {
            recipient: "parents",
            state: "exported",
            generated: [
              s("Ce qui avance", "L'année de {{child}} s'est nettement améliorée : les crises sont passées d'environ une par semaine à une toutes les deux ou trois semaines. Il utilise sa carte « j'ai besoin de bouger » deux à trois fois par jour, et le minuteur est devenu un rituel avec l'assistante. Depuis le début de son traitement, il est plus disponible le matin."),
              s("Ce qui reste difficile", "Les sorties scolaires et les jours avec un remplaçant restent des moments à risque."),
              s("Pour l'an prochain", "- poursuite d'une séance par semaine\n- apprendre à reconnaître lui-même son niveau d'énergie (son « moteur » : lent, moyen, rapide) et choisir quoi faire"),
            ],
          },
        ],
      },
      {
        key: "home-visit",
        docType: "home_visit",
        date: wd(-240),
        notes: `visite à domicile chez le père (garde alternée)
- devoirs sur la table du salon, TV allumée, petite sœur à côté
- chaise trop haute, pieds dans le vide
- devoirs vers 19h30, traitement plus actif
- propose : coin devoirs dans sa chambre, ballon de gym, séquences de 10 min + 2 min de pause avec minuteur, collation avant
- mêmes outils chez la mère (à transmettre)`,
        variants: [
          {
            recipient: "parents",
            state: "exported",
            generated: [
              s("Ce que nous avons observé", "Les devoirs se font le soir vers 19h30, sur la table du salon, télévision allumée et petite sœur à côté. La chaise est trop haute : les pieds de {{child}} ne touchent pas le sol. À cette heure-là, le traitement ne fait plus effet."),
              s("Ce que nous proposons", "- un coin devoirs dans sa chambre, au calme\n- s'asseoir sur un ballon de gym\n- travailler par séquences de 10 minutes, puis 2 minutes de pause, avec un minuteur\n- une collation avant de commencer\n- les mêmes outils dans les deux maisons"),
            ],
            edited: [
              s("Ce que nous avons observé", "Merci de m'avoir accueillie chez vous. Les devoirs se font le soir vers 19h30, sur la table du salon, télévision allumée et petite sœur à côté. La chaise est trop haute : les pieds d'{{first}} ne touchent pas le sol. À cette heure-là, son traitement ne fait plus effet : il a donc encore plus besoin d'un cadre calme."),
              s("Ce que nous proposons", "- un coin devoirs dans sa chambre, au calme\n- s'asseoir sur un ballon de gym (il peut bouger sans se lever)\n- travailler par séquences de 10 minutes, puis 2 minutes de pause, avec un minuteur\n- une collation avant de commencer\n- les mêmes outils dans les deux maisons : je peux transmettre ce compte-rendu à sa maman si vous le souhaitez"),
            ],
          },
        ],
      },
      {
        key: "guidance",
        docType: "parent_guidance",
        date: wd(-25),
        assessments: ["sp2-2"],
        notes: `rdv parents (les deux, en visio pour la mère)
- rentrée difficile : 4 crises la 1re semaine (nouvel enseignant)
- depuis : demande lui-même son « tour de cour »
- cantine : toujours difficile, file d'attente
- traitement augmenté (neuropédiatre) → plus calme le matin, rebond vers 15h au tsaharon
- conseils : collation protéinée à 15h, carte « moteur » aussi à la maison, même rituel des devoirs chez les deux parents
- prochain point dans 1 mois`,
        variants: [
          {
            recipient: "parents",
            state: "validated",
            generated: [
              s("Ce qui avance", "Après une première semaine difficile avec son nouvel enseignant, {{child}} demande maintenant lui-même son « tour de cour » quand il sent qu'il en a besoin. C'est un vrai progrès : il commence à reconnaître ses signaux."),
              s("Ce qui reste difficile", "L'attente à la cantine reste un moment de tension. Depuis l'ajustement de son traitement, il est plus calme le matin, mais s'agite davantage vers 15h au tsaharon."),
              s("À la maison ces prochaines semaines", "- une collation riche en protéines vers 15h\n- utiliser la carte du « moteur » à la maison aussi\n- le même rituel des devoirs chez chacun de vous"),
            ],
            edited: [
              s("Ce qui avance", "Après une première semaine difficile avec son nouvel enseignant, {{first}} demande maintenant lui-même son « tour de cour » quand il sent que la tension monte. C'est un vrai progrès : il commence à reconnaître ses propres signaux, et c'est exactement l'objectif de cette année."),
              s("Ce qui reste difficile", "L'attente à la cantine reste un moment de tension. Depuis l'ajustement de son traitement, il est plus calme le matin, mais s'agite davantage vers 15h au tsaharon, quand l'effet diminue."),
              s("À la maison ces prochaines semaines", "- une collation riche en protéines vers 15h (à voir avec le tsaharon)\n- utiliser la carte du « moteur » à la maison aussi\n- le même rituel des devoirs chez chacun de vous : même heure, même minuteur, même pause\n\nNous refaisons le point dans un mois."),
            ],
          },
        ],
      },
      {
        key: "follow-up",
        docType: "follow_up",
        date: wd(-8),
        notes: `séance
- arrive très agité (sortie de récré juste avant), 5 min de trampoline + sac lourd → disponible
- jeu du « moteur » : identifie seul « rapide » à l'arrivée et « moyen » après le trampoline
- parcours avec consignes à 3 étapes : réussi, attend son tour 2 fois sur 3
- école : 2 crises courtes cette semaine, rentre seul après son tour de cour
- à proposer : continuer carte moteur, ajouter « tour de cour » à l'emploi du temps visuel`,
        variants: [
          {
            recipient: "parents",
            state: "exported",
            generated: [
              s("Ce qui avance", "{{child}} est arrivé très agité, juste après la récréation. Après 5 minutes de trampoline et de sac lourd, il était prêt à travailler. Il a reconnu tout seul que son « moteur » était rapide en arrivant, puis moyen après le trampoline. À l'école, il n'a eu que deux crises courtes cette semaine, et il rentre seul en classe après son tour de cour."),
              s("Ce qui reste difficile", "Attendre son tour reste difficile : il y est arrivé deux fois sur trois pendant le parcours."),
              s("À la maison cette semaine", "- continuer la carte du « moteur »\n- ajouter le « tour de cour » à son emploi du temps en images"),
            ],
          },
        ],
      },
    ],
    events: [
      { kind: "intake", date: start, time: "17:00" },
      { kind: "parent_guidance", date: wd(5), time: "18:00", details: "Routines du matin et tableau visuel ; la grand-mère sera présente." },
      { kind: "other", date: wd(16), details: "Appeler la neuropédiatre (point sur le traitement et la fatigue en classe)." },
    ],
  };
}

// ---------------------------------------------------------------------------
// 4. Maya Elbaz — 5 years 4 months. Born very premature (29 weeks), motor delay and
// low muscle tone. Followed for 3 years: Knox at 30 and 36 months, then the SP2.

function maya(): ChildSpec {
  const birth = addMonths(TODAY, -64, 3);
  const start = workday(addMonths(birth, 28, 10));
  const knox1 = workday(addMonths(birth, 30, 12));
  const knox2 = workday(addMonths(birth, 36, 8));
  return {
    key: "maya",
    child: {
      name: "Maya Elbaz",
      birthDate: birth,
      referralReason: "Retard moteur et hypotonie (grande prématurité)",
      schoolLevel: "Gan hova (grande section)",
      followUpStart: start,
      medicalHistory:
        "Grande prématurité (29 SA + 3 j). Dysplasie bronchopulmonaire légère, oxygène jusqu'à 36 SA d'âge corrigé. Hypotonie axiale et hyperlaxité ligamentaire. ETF et IRM à terme sans lésion. Otites à répétition à 3 ans.",
      birthHistory: "Née à 29 SA + 3 j par césarienne en urgence (pré-éclampsie maternelle), 1 180 g. 7 semaines en néonatologie.",
      surgicalHistory: "Cure de strabisme convergent à 3 ans et demi.",
      familyComposition: "Vit avec ses parents et sa petite sœur (2 ans).",
      siblingsCount: 1,
      otherInfo: "Kinésithérapie une fois par semaine depuis l'âge de 6 mois corrigés. Orthophonie terminée l'an dernier. Bilan annuel au centre de développement de l'enfant. Âge corrigé à prendre en compte jusqu'à 2 ans.",
      knownTriggers: "Fatigue de fin de journée, longues marches, escaliers, sièges sans dossier, les journées où elle a kiné et gan.",
      hyperSensitivities: [],
      hypoReactivities: ["proprioception"],
      seeksDeepPressure: true,
      backgroundFactors: ["fatigue", "pain"],
      warningSigns: "S'affale sur la table, se frotte les yeux, demande à être portée, devient grognon.",
      calmingStrategies: ["break", "deepPressure", "Changer de position (ballon, assise au sol)", "Câlin et portage"],
      interests: ["animals", "music", "Pâte à modeler", "Princesses"],
      createdAt: sqlTimestamp(at(addDays(start, -5), "09:00")),
    },
    episodes: [
      { at: [1000, "17:30"], minutes: 10, kind: "difficulty", situation: "activity", antecedent: "Au parc, toboggan avec une échelle", behavior: "Refuse de monter, demande les bras", causes: ["fatigue", "tooDifficult"], helped: ["Monter avec un appui sous les pieds"] },
      { at: [880, "12:00"], minutes: 25, kind: "difficulty", situation: "eating", antecedent: "Viande hachée au déjeuner", behavior: "La garde longtemps en bouche, puis la recrache", causes: ["textures", "fatigue"], helped: ["Viande effilochée en sauce", "Chaise avec dossier et repose-pieds"] },
      { at: [700, "16:45"], minutes: 30, kind: "crisis", antecedent: "Fin de journée au gan, otite (diagnostiquée le lendemain)", behavior: "Pleurs inconsolables, se laisse tomber au sol", causes: ["illness", "pain", "fatigue"], helped: ["Câlin et portage", "deepPressure"], notes: "Otite diagnostiquée le lendemain : toujours penser à la douleur quand elle change de comportement." },
      { at: [520, "08:00"], school: true, minutes: 12, kind: "difficulty", situation: "transition", antecedent: "Escaliers pour monter au gan (nouveau bâtiment)", behavior: "S'arrête à chaque marche, refuse d'avancer", causes: ["fatigue", "unfamiliarPlace"], helped: ["Rampe à sa hauteur", "Compter les marches en chanson"] },
      { at: [330, "17:00"], minutes: 8, kind: "difficulty", situation: "activity", antecedent: "Vélo avec petites roues", behavior: "Abandonne au bout de 2 minutes, pleure", causes: ["fatigue", "frustration"], helped: ["break", "Draisienne plutôt que vélo"] },
      { at: [150, "16:30"], school: true, minutes: 10, kind: "difficulty", situation: "activity", antecedent: "Séance : parcours moteur avec poutre", behavior: "S'affale, dit « trop fatiguée »", causes: ["fatigue", "tooDifficult"], helped: ["Changer de position (ballon, assise au sol)", "break"], notes: "Fin de semaine chargée (kiné + ergo + anniversaire)." },
      { at: [25, "12:15"], school: true, minutes: 20, kind: "difficulty", situation: "eating", antecedent: "Repas du gan sur un banc sans dossier", behavior: "S'affaisse, mange avec les doigts, se fatigue avant la fin", causes: ["fatigue", "movementChange"], helped: ["Chaise avec dossier et repose-pieds"] },
      { at: [4, "16:00"], school: true, minutes: 15, kind: "crisis", antecedent: "Retour du gan à pied (15 minutes)", behavior: "S'assoit sur le trottoir, pleure, refuse d'avancer", causes: ["fatigue", "transition"], helped: ["Poussette pour le retour les jours de kiné", "Petite collation à la sortie"] },
    ],
    forms: [
      {
        key: "anamnesis",
        template: "anamnesis",
        created: addDays(start, -12),
        sent: addDays(start, -12),
        submitted: { at: at(addDays(start, -6), "20:15"), by: "parent" },
        answers: {
          "L'enfant": { "Nom et prénom de l'enfant": "Maya Elbaz", "Date de naissance": birth, "Langues parlées à la maison": ["Français", "Hébreu"] },
          "Grossesse et naissance": {
            "Terme à la naissance": 29,
            "Poids de naissance": 1180,
            "Hospitalisation en néonatologie": true,
            "Si oui, durée et motif": "7 semaines : prématurité, assistance respiratoire puis oxygène, alimentation par sonde les 4 premières semaines.",
          },
          "Premières acquisitions": {
            "Tient assis(e) seul(e) (date approximative)": addMonths(birth, 11, 15),
            "Premiers pas (date approximative)": addMonths(birth, 22, 5),
            "Premiers mots (date approximative)": addMonths(birth, 18, 1),
            "Propreté de jour": ["Pas encore"],
          },
          "Diagnostics et suivis": {
            "Diagnostic(s) posé(s)": "Retard de développement moteur, hypotonie (prématurité)",
            "Date du diagnostic": addMonths(birth, 9, 20),
            "Posé par": "Pédiatre du suivi des prématurés",
            "Suivis en cours ou passés": ["Kinésithérapie", "Orthophonie", "Neuropédiatre"],
            "Début de l'orthophonie": addMonths(birth, 24, 1),
            "Début de la kinésithérapie": addMonths(birth, 8, 10),
            "Dernière consultation chez le neuropédiatre": addMonths(birth, 26, 18),
            "Traitement médicamenteux": false,
          },
          "Vie quotidienne": {
            Sommeil: ["Bon"],
            "Alimentation : ce qu'il ou elle mange, ce qu'il ou elle refuse": "Mange de tout en purée ou en petits morceaux mous. La viande est difficile à mâcher. Se fatigue avant la fin du repas.",
            Habillage: ["Avec beaucoup d'aide"],
            "Quelles sont vos principales inquiétudes ?": "Elle se fatigue très vite, tombe souvent et ne monte pas encore les escaliers seule. Nous voulons qu'elle soit prête pour le gan.",
            "Qu'attendez-vous de l'ergothérapie ?": "L'aider à être plus autonome (manger, s'habiller) et à jouer comme les autres enfants.",
          },
        },
      },
      {
        key: "evaluation",
        template: "evaluation",
        created: start,
        submitted: { at: at(start, "12:40"), by: "therapist" },
        answers: {
          "סיבת ההפניה": {
            "תאריך ההערכה": start,
            "גורם מפנה": ["רופא/ת ילדים", "התפתחות הילד"],
            "סיבת ההפניה ותלונה עיקרית": "פגות קיצונית (שבוע 29), עיכוב מוטורי והיפוטוניה. קושי במשחק, באכילה ובעצמאות.",
            "ציפיות ההורים מהטיפול": "עצמאות באכילה ובלבוש, משחק כמו ילדים אחרים, היערכות לגן.",
          },
          "רקע התפתחותי ורפואי": {
            "הריון ולידה ללא סיבוכים": false,
            "אבני דרך מוטוריות הושגו בזמן": false,
            "מצבים רפואיים, אבחנות ותרופות": "פגות (29 שבועות, 1180 גרם), BPD קלה, היפוטוניה צירית, היפרמוביליות.",
            "טיפולים קודמים או נוכחיים": ["פיזיותרפיה", "קלינאות תקשורת"],
          },
          "מוטוריקה עדינה": {
            "יד דומיננטית": ["לא נקבעה"],
            "אחיזת עיפרון": ["אגרופית"],
            "מיומנויות": { "גזירה במספריים": "לא נבדק", "העתקת צורות": "קושי משמעותי", "השחלת חרוזים": "קושי בינוני", "כתיבה / ציור": "קושי בינוני" },
            "תצפיות נוספות": "חוסר יציבות בכתף ובשורש כף היד, מעדיפה לשחק בשכיבה על הבטן.",
          },
          "מוטוריקה גסה": {
            "מיומנויות": { "שיווי משקל": "קושי משמעותי", "קפיצה": "קושי משמעותי", "תפיסה וזריקת כדור": "קושי בינוני", "טיפוס": "קושי משמעותי", "תכנון תנועה": "קושי בינוני" },
            "טונוס שרירים": 1,
            "תצפיות נוספות": "הולכה על בסיס רחב, נופלת לעיתים קרובות, מטפסת במדרגות עם יד ביד.",
          },
          "עיבוד חושי": {
            "תגובות חושיות": { "מגע": "תגובה תקינה", "שמיעה": "תגובה תקינה", "ראייה": "תגובה תקינה", "תנועה (וסטיבולרי)": "תת-תגובתיות", "טעם וריח": "תגובה תקינה" },
            "השפעת העיבוד החושי על התפקוד היומיומי": "תת-תגובתיות פרופריוצפטיבית, נהנית מלחץ עמוק ומקפיצות על כדור.",
          },
          "ADL ועצמאות בטיפול עצמי": {
            "תחומים": { "לבוש": "תלוי/ה במבוגר", "אכילה": "זקוק/ה לעזרה חלקית", "רחצה": "תלוי/ה במבוגר", "שימוש בשירותים": "תלוי/ה במבוגר", "צחצוח שיניים": "תלוי/ה במבוגר" },
          },
          "גן / בית ספר ומשחק": {
            "מסגרת חינוכית וכיתה": "מעון יום",
            "קשב והתמדה במשימה": 3,
            "סוגי משחק מועדפים": ["משחק דמיוני", "משחקי הרכבה"],
            "משחק עם בני גילו ותפקוד במסגרת": "משחק מקביל, נמנעת ממשחקי תנועה בחצר.",
          },
          "סיכום ומטרות": {
            "סיכום ההערכה": "פעוטה בת שנתיים ו-4 חודשים (פגה), עיכוב מוטורי גס ועדין על רקע היפוטוניה, עם השפעה על המשחק והעצמאות.",
            "מטרות טיפול": "1. יציבות גו וכתפיים במשחק. 2. אכילה עצמאית בכפית. 3. משחק בנייה ומשחק סמלי. 4. הדרכת הורים והתאמות בבית.",
            "המלצה": ["טיפול בריפוי בעיסוק"],
          },
        },
      },
      { key: "back-to-school", template: "backToSchool", cycle: "current", created: day(-40) },
    ],
    tests: [
      {
        key: "knox-1",
        definition: knoxPreschoolPlayScale,
        testDate: knox1,
        status: "completed",
        by: "therapist",
        completedAfterDays: 1,
        answers: knoxAnswers({ grossMotor: 18, interests: 18, manipulation: 18, construction: 18, purpose: 24, attention: 24, imitation: 24, dramatization: 18, type: 24, cooperation: 24, humor: 24, language: 24 }),
      },
      {
        key: "knox-2",
        definition: knoxPreschoolPlayScale,
        testDate: knox2,
        status: "completed",
        by: "therapist",
        completedAfterDays: 0,
        answers: knoxAnswers({ grossMotor: 24, interests: 30, manipulation: 24, construction: 30, purpose: 30, attention: 30, imitation: 30, dramatization: 30, type: 30, cooperation: 30, humor: 30, language: 36 }),
      },
      {
        key: "sp2-1",
        definition: sensoryProfile2Child,
        testDate: wd(-370),
        status: "completed",
        by: "parent",
        completedAfterDays: 5,
        answers: sp2Answers(
          "maya-sp2-1",
          { SK: 1.6, AV: 1.3, SN: 1.4, RG: 2.6, none: 2 },
          { 33: 5, 34: 4, 35: 4, 36: 5, 37: 5, 38: 5, 39: 5, 40: 4, 41: 5, 42: 4, 53: 4, 57: 4 },
          { bodyPosition: "Se fatigue vite debout, s'appuie partout, se couche sur la table." },
        ),
      },
      {
        key: "sp2-2",
        definition: sensoryProfile2Child,
        testDate: wd(-2),
        status: "draft",
        answers: sp2Answers("maya-sp2-2", { SK: 1.6, AV: 1.3, SN: 1.4, RG: 2.3, none: 2 }, { 33: 4, 36: 4, 37: 4, 38: 4, 39: 4, 41: 5 }, {}, 41),
      },
    ],
    reports: [
      {
        key: "initial",
        docType: "initial_assessment",
        date: addDays(start, 7),
        forms: ["anamnesis", "evaluation"],
        tests: [{ name: "PDMS-2 (Peabody Developmental Motor Scales)", results: "Quotient moteur global : 72 (3e percentile). Motricité globale : 70. Motricité fine : 79." }],
        notes: `bilan initial, fille 2 ans 4 mois (âge corrigé 2 ans 1 mois), ex-prématurée 29 SA
- marche acquise à 22 mois, base large, chutes fréquentes
- escaliers : monte en tenant la main, descend sur les fesses
- assise au sol en W, se fatigue vite, préfère jouer à plat ventre
- MF : prise palmaire, empile 3 cubes, encastrements simples ok
- repas : cuillère avec aide, morceaux mous ok, viande difficile, fatigue en fin de repas
- PDMS-2 : QMG 72
- jeu : jeu symbolique émergent (nourrit la poupée), aime chanter
- à proposer : suivi hebdo, coordination avec la kiné, chaise adaptée + repose-pieds, jeux en appui (à genoux, debout contre table)`,
        variants: [
          {
            recipient: "parents",
            state: "exported",
            generated: [
              s("Ce que nous avons observé", "{{child}} est une petite fille joyeuse, qui adore chanter et commence à jouer à faire semblant : elle donne à manger à sa poupée. Elle marche depuis l'âge de 22 mois, avec les pieds écartés pour garder l'équilibre, et tombe encore souvent. Ses muscles sont souples et peu toniques : elle se fatigue vite et préfère jouer allongée sur le ventre."),
              s("Ce qui reste difficile", "- monter et descendre les escaliers\n- s'asseoir bien droite au sol ou sur une chaise\n- utiliser ses mains avec précision : elle tient encore les objets à pleine main\n- mâcher la viande, et finir son repas sans se fatiguer"),
              s("Ce que nous proposons", "- une séance par semaine, en lien avec sa kinésithérapeute\n- une chaise adaptée avec un appui sous les pieds pour les repas\n- des jeux à genoux ou debout contre une table, pour renforcer son dos et ses épaules"),
            ],
          },
          {
            recipient: "doctor",
            state: "exported",
            generated: [
              s("Contexte", "Bilan initial en ergothérapie de {{child}}, 2 ans 4 mois (âge corrigé 2 ans 1 mois), ancienne grande prématurée (29 SA + 3 j, 1 180 g), suivie en kinésithérapie depuis l'âge de 6 mois corrigés."),
              s("Observations et résultats", "- PDMS-2 : quotient moteur global 72 (3e percentile) ; motricité globale 70, motricité fine 79\n- Hypotonie axiale, hyperlaxité ; marche acquise à 22 mois sur base élargie, chutes fréquentes\n- Préhension palmaire ; fatigabilité marquée, y compris lors des repas"),
              s("Recommandations", "Suivi hebdomadaire en ergothérapie coordonné avec la kinésithérapie : stabilité proximale, motricité fine, autonomie au repas, adaptation de l'installation."),
            ],
          },
        ],
      },
      {
        key: "home-visit",
        docType: "home_visit",
        date: workday(addDays(start, 40)),
        notes: `visite à domicile
- repas sur chaise haute sans repose-pieds, s'affaisse au bout de 10 min
- jouets rangés en hauteur, elle doit demander
- salle de bain : marchepied instable
- propose : repose-pieds (planche réglable), jouets dans bacs au sol, marchepied antidérapant avec poignées, coussin cale-dos`,
        variants: [
          {
            recipient: "parents",
            state: "exported",
            generated: [
              s("Ce que nous avons observé", "Merci de nous avoir accueillies. Pendant le repas, {{child}} est assise dans sa chaise haute sans appui pour les pieds : au bout d'une dizaine de minutes, elle s'affaisse. Ses jouets sont rangés en hauteur, et le marchepied de la salle de bain bouge sous ses pieds."),
              s("Ce que nous proposons", "- une planche réglable sous ses pieds dans la chaise haute\n- un petit coussin dans le dos pour la caler\n- des bacs à jouets posés au sol, qu'elle peut ouvrir seule\n- un marchepied antidérapant avec poignées"),
            ],
          },
        ],
      },
      {
        key: "knox-follow-up",
        docType: "follow_up",
        date: workday(addDays(knox2, 3)),
        assessments: ["knox-1", "knox-2"],
        notes: `point après Knox 36 mois
- progrès dans tous les domaines du jeu depuis 6 mois, surtout jeu symbolique et construction
- motricité globale reste le domaine le plus en retard
- escaliers : monte en alternant avec la rampe
- mange seule à la cuillère, commence la fourchette
- entrée au gan en septembre : prévoir chaise avec dossier et accoudoirs, temps de repos`,
        variants: [
          {
            recipient: "parents",
            state: "exported",
            generated: [
              s("Ce qui avance", "Le bilan de jeu montre que {{child}} a progressé dans tous les domaines en six mois, et surtout dans le jeu de faire semblant et les constructions. Elle monte maintenant les escaliers en alternant les pieds, en tenant la rampe, et mange seule à la cuillère."),
              s("Ce qui reste difficile", "Les jeux de mouvement (courir, grimper, sauter) restent le domaine où elle a le plus de retard par rapport aux enfants de son âge."),
              s("Pour l'entrée au gan", "- une chaise avec dossier et accoudoirs\n- des temps de repos prévus dans la journée\n- je peux rencontrer l'équipe du gan avant la rentrée si vous le souhaitez"),
            ],
          },
        ],
      },
      {
        key: "year-end-1",
        docType: "year_end_summary",
        date: wd(-465),
        tests: [{ name: "PDMS-2 (retest)", results: "Quotient moteur global : 81 (10e percentile). Motricité globale : 78. Motricité fine : 88." }],
        notes: `fin d'année gan trom-trom-hova
- PDMS-2 retest : QMG 81 (était 72)
- saute à pieds joints, tient 3 s sur un pied
- découpe une ligne droite, prise tripode émergente
- habillage : enfile pantalon et t-shirt seule, pas les chaussures
- fatigue toujours importante en fin de journée, kiné maintenue
- l'an prochain : graphisme, autonomie aux toilettes et à l'habillage, vélo/draisienne`,
        variants: [
          {
            recipient: "parents",
            state: "exported",
            generated: [
              s("Ce qui avance", "Quelle année pour {{child}} ! Le test moteur montre de beaux progrès, en particulier pour l'adresse des mains. Elle saute à pieds joints, tient 3 secondes sur un pied, découpe une ligne droite et commence à tenir le crayon entre trois doigts. Elle enfile seule son pantalon et son t-shirt."),
              s("Ce qui reste difficile", "La fatigue de fin de journée reste importante, et les chaussures lui demandent encore de l'aide."),
              s("Pour l'an prochain", "- le dessin et les premières formes\n- l'autonomie aux toilettes et à l'habillage\n- la draisienne, en lien avec la kinésithérapeute"),
            ],
          },
        ],
      },
      {
        key: "year-end-2",
        docType: "year_end_summary",
        date: wd(-100),
        assessments: ["sp2-1"],
        notes: `fin d'année gan trom-hova
- dessine un bonhomme (tête, corps, bras), trace croix et carré
- habillage complet seule sauf lacets ; propre de jour
- SP2 (parents) : enregistrement « beaucoup plus que les autres », position du corps élevée, recherche dans la norme
- draisienne ok, vélo avec roulettes 2 min
- fatigue : demande encore à être portée au retour du gan
- l'an prochain gan hova : graphisme pré-écriture, endurance, chaise adaptée à maintenir`,
        variants: [
          {
            recipient: "parents",
            state: "exported",
            generated: [
              s("Ce qui avance", "{{child}} dessine maintenant un bonhomme avec une tête, un corps et des bras, et trace une croix et un carré. Elle s'habille entièrement seule, sauf les lacets, et elle est propre la journée. Elle roule en draisienne."),
              s("Ce qui reste difficile", "Le questionnaire sensoriel montre qu'elle perçoit moins bien que les autres enfants les informations de son corps (position, effort), ce qui explique en partie sa fatigue : elle demande encore à être portée au retour du gan."),
              s("Pour l'an prochain", "- préparer l'écriture (tracés, formes)\n- travailler l'endurance\n- garder une chaise adaptée au gan"),
            ],
            edited: [
              s("Ce qui avance", "Encore une très belle année pour {{first}} ! Elle dessine maintenant un bonhomme avec une tête, un corps et des bras, et trace une croix et un carré. Elle s'habille entièrement seule (sauf les lacets) et elle est propre la journée. Elle roule fièrement en draisienne."),
              s("Ce qui reste difficile", "Le questionnaire sensoriel que vous avez rempli montre qu'elle perçoit moins bien que les autres enfants les informations venant de son corps (sa position, l'effort de ses muscles). Cela explique en partie sa fatigue : elle demande encore à être portée au retour du gan, et ce n'est pas un caprice."),
              s("Pour l'an prochain (gan hova)", "- préparer l'écriture : tracés, formes, tenue du crayon\n- travailler l'endurance, en lien avec la kinésithérapeute\n- garder une chaise adaptée au gan (dossier et appui sous les pieds)"),
            ],
          },
        ],
      },
      {
        key: "year-start",
        docType: "year_start_summary",
        date: wd(-20),
        notes: `rentrée gan hova
- adaptation ok, gannenet prévenue (chaise avec dossier fournie)
- repas sur banc sans dossier à la cantine → s'affaisse, demande faite au gan
- fatigue au retour à pied les jours de kiné → poussette ces jours-là
- objectifs : pré-écriture (tripode, formes), découpage, endurance, préparation kita alef
- SP2 à refaire en octobre`,
        variants: [
          {
            recipient: "parents",
            state: "validated",
            generated: [
              s("Ce qui avance", "{{child}} s'est bien adaptée à son gan cette année. La gannenet est au courant de ses besoins, et une chaise avec dossier a été installée en classe."),
              s("Ce qui reste difficile", "Au repas, elle est assise sur un banc sans dossier et s'affaisse ; nous avons fait une demande au gan. Les jours de kiné, le retour à pied la fatigue beaucoup."),
              s("Les objectifs de l'année", "- préparer l'écriture : tenue du crayon, formes\n- le découpage\n- l'endurance\n- préparer l'entrée en kita alef\n\nLes jours de kiné, la poussette pour le retour peut l'aider."),
            ],
          },
        ],
      },
    ],
    events: [
      { kind: "intake", date: start, time: "10:30" },
      { kind: "report_due", date: day(-3), report: "year-start", details: "Pour la coordinatrice de l'école." },
      { kind: "parent_guidance", date: wd(10), time: "16:30", details: "Jeu à la maison : proposer des activités de jeu symbolique." },
      { kind: "other", date: day(21), details: "Renouvellement de la prescription de séances à demander au médecin traitant." },
    ],
  };
}

export const fr: DemoCabinet = {
  key: "fr",
  ids: DEMO_CABINET_IDS.fr,
  language: "fr",
  weekend: "fri-sat",
  therapistName: "Déborah Azoulay",
  account: {
    name: "Cabinet d'ergothérapie pédiatrique Azoulay",
    letterhead: "Déborah Azoulay — Ergothérapeute pédiatrique (M.Sc. OT)\n14, rehov Smilansky, Netanya\nTél. 052-555-0142 · demo@ergo-ai.app\nLicence n° 1-27384 (ministère de la Santé)",
    schoolYearStart: "09-01",
  },
  builtinForms: "use",
  templates: [
    { key: "anamnesis", source: ANAMNESIS, file: "Anamnese-parents.docx", kind: "docx", createdDaysAgo: 1120, autoAssign: false, tokens: [3120, 2280] },
    { key: "teacher", source: TEACHER, file: "Questionnaire-enseignant.pdf", kind: "pdf", createdDaysAgo: 400, autoAssign: false, deadlineInDays: 9, tokens: [4810, 1650] },
    { key: "backToSchool", source: BACK_TO_SCHOOL, file: "Questionnaire-rentree.docx", kind: "docx", createdDaysAgo: 45, autoAssign: true, deadlineInDays: -1, tokens: [2240, 1390] },
  ],
  children: () => [noam(), lea(), ethan(), maya()],
};
