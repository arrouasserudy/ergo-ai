import type { StyleGuide } from "../types";

/**
 * English professional register of pediatric OT reports.
 * DRAFT: content awaits review by a professional OT. The model report is fictional.
 */
export const STYLE: StyleGuide = {
  register: [
    { id: "observational", text: 'Use the observational register of clinical reports: "was observed", "{{child}} demonstrated", "it appears that". Recommendations: "it is recommended that", "continue to".' },
    { id: "third-person", text: "Write about the child in the third person ({{child}}). The parents version may use \"we\" for the therapist." },
    { id: "pronouns", text: "Use the pronouns given in the notes; when unknown, use the child's placeholder or \"they\"." },
    { id: "expand-abbreviations", text: "Expand the therapist's abbreviations (FM → fine motor, GM → gross motor, Tx → therapy, OT session). Keep test acronyms (SP2, VMI, MABC-2, BOT-2)." },
    { id: "no-slang", text: "No casual language, no exclamation marks." },
    { id: "sentences", text: "Short sentences, one idea each; paragraphs of 2 to 4 sentences." },
    { id: "parents-tone", text: "Parents version: professional yet warm. Explain each technical term in everyday words the first time. Strengths first, then difficulties, then concrete steps at home." },
    { id: "hedging", text: 'Hypotheses are worded as possibilities: "this may be related to", "one possible explanation is".' },
  ],
  glossary: [
    { id: "modulation", term: "sensory modulation", meaning: "adjusting responses to sensory input" },
    { id: "over-responsivity", term: "sensory over-responsivity", meaning: "stronger than typical reactions to sensation", avoid: "overreacts to everything" },
    { id: "seeking", term: "sensory seeking", meaning: "actively looking for sensory input" },
    { id: "proprioception", term: "proprioception", meaning: "body position sense" },
    { id: "vestibular", term: "vestibular processing", meaning: "balance and movement sense" },
    { id: "self-regulation", term: "self-regulation", meaning: "managing arousal, emotions and behaviour" },
    { id: "praxis", term: "praxis / motor planning", meaning: "planning and sequencing new movements" },
    { id: "bilateral", term: "bilateral coordination", meaning: "using both sides of the body together" },
    { id: "proximal-stability", term: "proximal stability", meaning: "trunk and shoulder stability" },
    { id: "postural-tone", term: "low postural tone", meaning: "reduced muscle tone for posture", avoid: "floppy" },
    { id: "fine-motor", term: "fine motor skills", meaning: "precise hand movements" },
    { id: "grasp", term: "pencil grasp (tripod, quadrupod, palmar)", meaning: "how the pencil is held" },
    { id: "vmi", term: "visual-motor integration", meaning: "coordinating vision and hand movement" },
    { id: "selectivity", term: "food selectivity", meaning: "limited range of accepted foods", avoid: "picky eater" },
    { id: "adl", term: "activities of daily living (ADL)", meaning: "self-care tasks" },
    { id: "mediation", term: "adult mediation / support (verbal, visual, physical cues)", meaning: "help given during a task", avoid: "I had to help him a lot" },
    { id: "paper-stabilization", term: "stabilizing the paper with the assisting hand", meaning: "holding the paper while cutting or writing" },
    { id: "fixation", term: "sustained visual fixation", meaning: "keeping the gaze on a target" },
    { id: "tracking", term: "visual tracking", meaning: "following a moving object with the eyes" },
    { id: "eye-hand", term: "eye-hand coordination", meaning: "guiding the hand with vision" },
  ],
  phrasing: [
    { id: "cant-sit", avoid: "he can't sit still", prefer: "difficulty maintaining a seated position was observed" },
    { id: "hates-mess", avoid: "she hates getting dirty", prefer: "avoidance of messy textures was noted" },
    { id: "freaked-out", avoid: "he freaked out", prefer: "an emotional outburst occurred during the session" },
    { id: "bad-at", avoid: "he is bad at cutting", prefer: "cutting remains challenging, particularly bilateral coordination" },
    { id: "fine", avoid: "gross motor is fine", prefer: "gross motor skills are age-appropriate" },
    { id: "help-cutting", avoid: "he struggled to hold the paper and cut on the line, I had to help him a lot", prefer: "difficulty stabilizing the paper and staying on the cutting line was observed; substantial support was needed throughout the task" },
    { id: "again", avoid: "after he managed it he wanted to do it again", prefer: "after succeeding, increased motivation and a wish to try again were observed" },
    { id: "needs-exercises", avoid: "he needs to do exercises at home", prefer: "it is recommended to include … at home twice a day, about five minutes" },
    { id: "doesnt-listen", avoid: "she doesn't listen", prefer: "several verbal prompts were needed to start the task" },
    { id: "lazy", avoid: "he is lazy about writing", prefer: "sustained writing requires considerable effort and leads to fatigue" },
  ],
  examples: [
    {
      id: "en-follow-up-clinical",
      docType: "follow_up",
      recipient: "clinical",
      notes: `session 6, 5y 9m, reception
- swing 4 min then settled at table
- cutting: couldn't hold the paper, went off the line a lot, I had to help him a lot. after he managed it he wanted to do it again
- threading 8 big beads alone
- copying: circle and cross ok, square not yet
- next: spring scissors, thick line`,
      sections: [
        {
          heading: "Session activities",
          body: "The session opened with vestibular input on the swing (about four minutes), followed by fine motor tasks at the table, where {{child}} maintained an appropriate seated position.",
        },
        {
          heading: "Performance and observations",
          body: "- During cutting, **difficulty stabilizing the paper and staying on the cutting line** was observed; substantial support was needed throughout the task\n- After succeeding, increased motivation and a wish to try again were observed\n- Threading eight large beads was completed independently\n- In copying, the circle and the cross were reproduced; the square is not yet achieved",
        },
        {
          heading: "Next steps",
          body: "- Continue cutting practice with spring scissors along a thick line",
        },
      ],
    },
    {
      id: "en-follow-up-parents",
      docType: "follow_up",
      recipient: "parents",
      notes: `Session 6, 5y 8m, kindergarten
- came in very active after the bus
- heavy work (pushing ball, carrying bean bags) 5 min → calmer
- puzzle 12 pcs: done w/ 2 prompts
- scissors: snips only, holds paper with fingertips
- pencil: quadrupod, presses hard
- cried when timer ended swing, settled w/ hug + countdown
- loves trains
- next: bilateral tasks, first-then board`,
      sections: [
        {
          heading: "What is progressing",
          body: "{{child}} arrived very active after the bus ride. After five minutes of heavy work (pushing a large ball, carrying bean bags), he was calmer and able to start table activities. He completed a 12-piece puzzle with two prompts. His love of trains remains a great way to motivate him.",
        },
        {
          heading: "What is still difficult",
          body: "- With scissors he makes single snips and holds the paper with his fingertips\n- He holds the pencil with four fingers and presses hard\n\nHe cried when the timer ended his turn on the swing, and settled with a hug and a countdown.",
        },
        {
          heading: "At home this week",
          body: "- Give a short warning before ending a favourite activity (\"two more minutes, then we stop\")",
        },
      ],
    },
  ],
};
