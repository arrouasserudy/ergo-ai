import type { StyleGuide } from "../types";

/**
 * French professional register of pediatric OT (ergothérapie) reports.
 * DRAFT: content awaits review by a professional OT. The model report is fictional.
 */
export const STYLE: StyleGuide = {
  register: [
    { id: "observational", text: 'Use the observational register of French clinical reports: "on observe", "on note", "il apparaît que", "{{child}} présente". Recommendations: "il est recommandé de", "nous préconisons".' },
    { id: "third-person", text: "Write about the child in the third person ({{child}}). The parents version may use \"nous\" for the therapist (\"nous avons travaillé\")." },
    { id: "gender", text: "Agree adjectives and participles with the child's gender as given in the notes; when unknown, prefer noun forms (\"une difficulté à…\", \"un évitement de…\")." },
    { id: "expand-abbreviations", text: "Expand the therapist's abbreviations (MF → motricité fine, MG → motricité globale, ttt → traitement, séance). Keep test acronyms (SP2, VMI, M-ABC 2, BHK)." },
    { id: "no-slang", text: "No familiar language, no exclamation marks; avoid anglicisms when a French term exists." },
    { id: "sentences", text: "Short sentences, one idea each; paragraphs of 2 to 4 sentences." },
    { id: "parents-tone", text: "Parents version: professional yet warm. Explain each technical term in everyday words the first time it appears. Strengths first, then difficulties, then concrete steps at home." },
    { id: "hedging", text: 'Hypotheses are worded as possibilities: "il est possible que", "cela pourrait s\'expliquer par", "on peut faire l\'hypothèse que".' },
  ],
  glossary: [
    { id: "modulation", term: "modulation sensorielle", meaning: "sensory modulation" },
    { id: "hypersensibilite", term: "hyperréactivité sensorielle", meaning: "sensory over-responsivity", avoid: "il est hypersensible à tout" },
    { id: "recherche", term: "recherche sensorielle", meaning: "sensory seeking" },
    { id: "proprioception", term: "proprioception", meaning: "body position sense" },
    { id: "vestibulaire", term: "système vestibulaire", meaning: "balance and movement sense" },
    { id: "regulation", term: "autorégulation", meaning: "self-regulation" },
    { id: "praxies", term: "praxies / planification motrice", meaning: "motor planning" },
    { id: "coordination-bimanuelle", term: "coordination bimanuelle", meaning: "bilateral coordination" },
    { id: "stabilite-proximale", term: "stabilité proximale", meaning: "proximal stability" },
    { id: "tonus", term: "hypotonie posturale", meaning: "low postural tone", avoid: "il est tout mou" },
    { id: "motricite-fine", term: "motricité fine", meaning: "fine motor skills" },
    { id: "prise", term: "prise du crayon (tridigitale, quadripode, palmaire)", meaning: "pencil grasp" },
    { id: "visuomotricite", term: "intégration visuomotrice", meaning: "visual-motor integration" },
    { id: "graphomotricite", term: "graphomotricité", meaning: "graphomotor skills" },
    { id: "selectivite", term: "sélectivité alimentaire", meaning: "food selectivity", avoid: "il est difficile à table" },
    { id: "avq", term: "activités de la vie quotidienne (AVQ)", meaning: "activities of daily living" },
    { id: "etayage", term: "étayage / guidance (verbale, visuelle, physique)", meaning: "adult support during a task", avoid: "j'ai dû beaucoup l'aider" },
    { id: "stabilisation", term: "stabilisation de la feuille par la main d'appui", meaning: "stabilizing the paper" },
    { id: "trajectoire", term: "maintien de la trajectoire de découpage", meaning: "staying on the cutting line" },
    { id: "fixation", term: "maintien de la fixation visuelle", meaning: "sustained visual fixation" },
    { id: "poursuite", term: "poursuite oculaire", meaning: "visual tracking of a moving object" },
    { id: "coordination-oeil-main", term: "coordination oculo-manuelle", meaning: "eye-hand coordination" },
  ],
  phrasing: [
    { id: "tient-pas", avoid: "il ne tient pas en place", prefer: "on observe une difficulté à maintenir la position assise" },
    { id: "aime-pas", avoid: "elle n'aime pas se salir", prefer: "on note un évitement du contact avec les matières salissantes" },
    { id: "crise", avoid: "il a pété un câble", prefer: "une crise est survenue au cours de la séance" },
    { id: "nul", avoid: "il est nul en découpage", prefer: "le découpage reste difficile, notamment la coordination des deux mains" },
    { id: "ok", avoid: "la motricité globale est ok", prefer: "la motricité globale est adaptée à l'âge" },
    { id: "faut", avoid: "il faut faire des exercices à la maison", prefer: "il est recommandé d'intégrer à la maison … deux fois par jour, environ cinq minutes" },
    { id: "ecoute-pas", avoid: "elle n'écoute pas", prefer: "plusieurs rappels verbaux ont été nécessaires pour débuter la tâche" },
    { id: "bien-progresse", avoid: "il a trop bien progressé !", prefer: "on note une progression nette de…" },
    { id: "aide-decoupage", avoid: "il galérait à tenir la feuille et à couper sur le trait, j'ai dû beaucoup l'aider", prefer: "on observe une difficulté à stabiliser la feuille et à maintenir la trajectoire de découpage ; un étayage important a été nécessaire tout au long de la tâche" },
    { id: "encore", avoid: "après, il a voulu recommencer", prefer: "après la réussite de la tâche, on note une hausse de la motivation et le souhait de renouveler l'expérience" },
  ],
  examples: [
    {
      id: "fr-follow-up-clinical",
      docType: "follow_up",
      recipient: "clinical",
      notes: `Séance 4, 6 ans, GS
- parcours moteur : saute à pieds joints, perd l'équilibre sur 1 pied après 2 sec
- découpage : tient mal la feuille, sort du trait, j'ai dû beaucoup l'aider
- après réussite, a voulu recommencer tout seul
- puzzle 20 p. : fini seul, 6 min
- à poursuivre : ciseaux à ressort, épaisseur du trait`,
      sections: [
        {
          heading: "Déroulement de la séance",
          body: "La séance a associé un parcours moteur et des activités de motricité fine à table.",
        },
        {
          heading: "Performances et observations",
          body: "- En motricité globale, {{child}} réalise des sauts à pieds joints ; l'équilibre unipodal n'est maintenu que deux secondes\n- Au découpage, on observe **une difficulté à stabiliser la feuille et à maintenir la trajectoire de découpage**. Un étayage important a été nécessaire tout au long de la tâche\n- Après la réussite de la tâche, on note une hausse de la motivation et le souhait de renouveler l'expérience seul\n- Un puzzle de 20 pièces a été réalisé en autonomie, en six minutes",
        },
        {
          heading: "Suite de la prise en charge",
          body: "- Poursuite du découpage avec des ciseaux à ressort, sur un trait épais",
        },
      ],
    },
    {
      id: "fr-follow-up-parents",
      docType: "follow_up",
      recipient: "parents",
      notes: `Séance 7, 7 ans 2 mois, CE1
- arrivé agité, sortie de récré
- trampoline 5 min → plus posé ensuite
- écriture : lettres de taille irrégulière, appuie fort, se plaint de la main après 1 ligne
- découpage ligne courbe : tourne les ciseaux et pas la feuille
- refus de recopier la phrase, a jeté le crayon, reparti après pause sur le coussin
- adore les Lego
- à poursuivre : renforcement main, plan incliné`,
      sections: [
        {
          heading: "Ce qui progresse",
          body: "{{child}} est arrivé agité à la sortie de la récréation. Après cinq minutes de trampoline, il était plus posé et a pu s'engager dans le travail à table. Son intérêt pour les Lego reste un appui précieux pour le motiver.",
        },
        {
          heading: "Ce qui reste difficile",
          body: "- À l'écriture, les lettres sont de taille irrégulière et il appuie fortement sur le crayon. Il s'est plaint de la main après une ligne\n- Pour découper une ligne courbe, il tourne les ciseaux au lieu de tourner la feuille\n\nIl a refusé de recopier une phrase et a jeté son crayon. Il a pu reprendre après une courte pause sur le coussin.",
        },
        {
          heading: "À la maison cette semaine",
          body: "- Des jeux de renforcement de la main (pâte à modeler, pinces à linge), environ cinq minutes par jour",
        },
      ],
    },
  ],
};
