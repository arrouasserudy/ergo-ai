import type { OtDomain } from "./types";

/**
 * Clinical reasoning per domain, in English for the model.
 * DRAFT: content awaits review by a professional pediatric OT before it is relied on.
 */
export const OT_DOMAINS: OtDomain[] = [
  {
    id: "sensory-modulation",
    title: "Sensory processing and modulation",
    signs: [
      "Covers ears or flees with noise (crowds, hair dryer, flushing)",
      "Refuses messy textures; distress at tooth brushing, haircut",
      "Constantly moves, crashes, jumps, chews objects, seeks tight hugs",
      "Seems not to notice name, pain or a messy face; slow to start",
      "Fussy about clothing labels, socks, seams",
    ],
    hypotheses: [
      "Over-responsivity (Dunn: sensitivity/avoiding) lowering tolerance for the setting",
      "Sensation seeking (Dunn: seeking) to get enough input to stay organised",
      "Low registration (Dunn): needs stronger input to respond",
      "Cumulative sensory load: reactions grow later in the day",
    ],
    toCheck: [
      "Sensory Profile 2 (parent / school) to compare settings",
      "Which senses, which contexts, time of day, what calms",
    ],
    recommendations: [
      "Sensory diet: heavy-work breaks before demanding tasks",
      "Lower environmental load (ear defenders, quiet corner)",
      "Graded exposure to avoided sensations, child in control",
      "Explain the sensory profile to parents and staff",
    ],
  },
  {
    id: "self-regulation",
    title: "Self-regulation and arousal",
    signs: [
      "Hard to calm after excitement or frustration; long recovery time",
      "Swings between over-excited and shut-down within the session",
      "Meltdowns at transitions, when a game ends or plans change",
      "Uses rigid routines or repetitive behaviour to cope",
    ],
    hypotheses: [
      "Arousal level not matched to the task (too high or too low), limiting participation",
      "Difficulty anticipating transitions: unpredictability raises arousal",
      "Sensory load or fatigue (sleep, hunger) lowering the threshold that day",
    ],
    toCheck: [
      "Antecedents of dysregulation: what happened just before, time, place, demand",
      "Sleep, meals and day's events before the session",
    ],
    recommendations: [
      "Visual schedule and warnings before transitions (timer, first-then)",
      "Teach state awareness with a simple colour/engine scale (Zones/Alert-program style)",
      "Agreed calming toolbox: heavy work, breathing, quiet corner, fidget",
      "Co-regulation first: calm adult, fewer words, lower demands",
    ],
  },
  {
    id: "praxis",
    title: "Praxis and motor planning",
    signs: [
      "Struggles with new motor tasks, learns them slowly, then does well once automatic",
      "Clumsy, bumps into things, difficulty sequencing an obstacle course",
      "Limited or repetitive play ideas; needs a model to start",
      "Hard time imitating postures or gestures; dressing takes long",
    ],
    hypotheses: [
      "Difficulty with ideation, planning or sequencing of new movements (dyspraxia pattern, not a diagnosis)",
      "Poor body awareness (proprioceptive/vestibular processing) underlying planning difficulties",
      "Avoidance of motor tasks as a learned response to repeated failure",
    ],
    toCheck: [
      "Imitation of postures, sequencing, bilateral coordination",
      "Standardized motor assessment if age-appropriate (e.g. MABC-2, BOT-2)",
    ],
    recommendations: [
      "Break tasks into steps with a visual or verbal sequence; practise in context",
      "Obstacle courses the child helps design (ideation), then plans aloud",
      "Rich proprioceptive and vestibular play to build body awareness",
      "Allow extra time and success-oriented grading so motivation stays high",
    ],
  },
  {
    id: "postural-gross-motor",
    title: "Postural control and gross motor",
    signs: [
      "Slumps at the table, leans on arm or head, W-sitting",
      "Tires quickly, low endurance, avoids climbing or swings",
      "Poor balance, frequent falls, difficulty on stairs or one-leg standing",
      "Feet do not reach the floor; moves constantly on the chair",
    ],
    hypotheses: [
      "Low postural tone or reduced core stability making sitting effortful",
      "Vestibular processing difficulty (insecurity or under-responsivity)",
      "Seating not adapted to size, so movement is a way to stay upright",
    ],
    toCheck: [
      "Seating at home and school (feet supported, table height)",
      "Endurance across the session; balance and bilateral tasks",
    ],
    recommendations: [
      "Adapt seating: footrest, table at elbow height, cushion or wedge",
      "Core and shoulder-girdle strengthening through play (crawling, wheelbarrow, scooter board)",
      "Graded vestibular activities with the child in control",
      "Alternate positions for work (standing, lying on tummy)",
    ],
  },
  {
    id: "fine-motor-visual-motor",
    title: "Fine motor and visual-motor integration",
    signs: [
      "Immature grasp for age (fisted, palmar), switches hands, no dominance yet",
      "Difficulty with scissors, beads, buttons, small pieces",
      "Avoids table tasks, drawing, puzzles",
      "Weak or excessive pressure; tires quickly",
    ],
    hypotheses: [
      "Reduced hand strength or in-hand manipulation limiting precision",
      "Visual-motor or visual-perceptual difficulty (copying, puzzles)",
      "Tactile avoidance reducing practice with materials",
    ],
    toCheck: [
      "Grasp, dominance, bilateral coordination against age norms",
      "VMI or a visual-perceptual test if copying is difficult",
    ],
    recommendations: [
      "Hand-strengthening play (dough, tongs, clothes pegs, squeeze toys)",
      "Short crayons or chunky tools to promote a mature grasp",
      "Work on a vertical surface to support wrist position and shoulder stability",
      "Graded cutting and manipulation tasks linked to the child's interests",
    ],
  },
  {
    id: "graphomotor",
    title: "Handwriting and graphomotor skills",
    signs: [
      "Slow, effortful writing; letters of uneven size; poor spacing or line use",
      "Inefficient pencil grip, fatigue or pain, very heavy or light pressure",
      "Copying from the board slow, many errors",
      "Avoids writing, tasks not finished in class",
    ],
    hypotheses: [
      "Writing not yet automatic: motor planning of letters takes attention away from content",
      "Visual-motor or visual-perceptual difficulty (spacing, alignment, copying)",
      "Hand fatigue from inefficient grip or reduced strength",
      "Attention or organisation difficulty affecting output rather than motor skill",
    ],
    toCheck: [
      "Legibility and speed against grade norms; near versus far copy",
      "Grip, posture and seating while writing",
    ],
    recommendations: [
      "Short daily practice of letter formation by movement groups",
      "Grip aid, slant board or lined paper with clear guides as needed",
      "Classroom accommodations: less copying, extra time, photocopied notes",
      "Consider keyboarding when handwriting limits participation (older children)",
    ],
  },
  {
    id: "feeding",
    title: "Feeding, oral-motor and mealtime behaviour",
    signs: [
      "Very limited food repertoire, refuses new foods or textures",
      "Gags at the sight, smell or touch of food; spits lumps",
      "Inefficient chewing, pockets food, long meals",
      "Eats only with a screen or in a fixed way",
    ],
    hypotheses: [
      "Oral or olfactory over-responsivity making new textures aversive",
      "Oral-motor skill not matched to the texture offered",
      "Learned anxiety around mealtimes after negative experiences",
    ],
    toCheck: [
      "Growth, weight and medical issues (reflux, constipation, allergies) with the doctor",
      "Choking or coughing during meals, which needs medical assessment",
      "Mealtime routine, seating, foods accepted and how they are presented",
    ],
    recommendations: [
      "Gradual food exposure in steps (look, touch, smell, lick, taste), never forced (SOS-style)",
      "Stable seating with feet supported during meals",
      "Divided plate, one new food next to accepted foods, small portions",
      "Predictable, shorter meals without screens",
    ],
  },
  {
    id: "adl-self-care",
    title: "Activities of daily living and self-care",
    signs: [
      "Needs more help than peers to dress, wash, toilet",
      "Difficulty with fasteners, shoes, sequencing a routine",
      "Bedtime and sleep routine difficult; morning routine tense",
      "Toilet training delayed or resisted",
    ],
    hypotheses: [
      "Motor planning or fine motor difficulty making the task long",
      "Sensory responses (clothing, water, toilet noise) leading to avoidance",
      "Routine not yet structured or too many steps at once",
    ],
    toCheck: [
      "What the child does alone, with help, or not at all (task analysis)",
      "Medical issues for toileting or sleep with the doctor",
    ],
    recommendations: [
      "Visual sequence of the routine, one step taught at a time (backward chaining)",
      "Adapted clothing (elastic, velcro) while skills develop",
      "Calm, predictable bedtime routine with low sensory load",
      "Praise effort and allow time; adult does less step by step",
    ],
  },
  {
    id: "play-participation",
    title: "Play and social participation",
    signs: [
      "Prefers solitary or repetitive play (lining up, spinning objects)",
      "Little symbolic or pretend play for age",
      "Difficulty joining peers, taking turns, sharing",
      "Plays better with adults than with peers",
    ],
    hypotheses: [
      "Limited play ideation or motor planning restricting play options",
      "Sensory demands of group play (noise, touch) leading to withdrawal",
      "Social communication differences affecting shared play",
    ],
    toCheck: [
      "Play level against age; preferred interests",
      "Behaviour in structured versus free play, with peers versus adults",
    ],
    recommendations: [
      "Use the child's interests to extend play (add a step, a character, a peer)",
      "Structured turn-taking games with visual turn cues",
      "Small-group or pair play in a calm setting before larger groups",
      "Guide parents on following the child's lead in play at home",
    ],
  },
  {
    id: "attention-executive",
    title: "Attention and executive function in tasks",
    signs: [
      "Leaves tasks unfinished, needs repeated prompts",
      "Easily distracted by noise or objects; restless at the table",
      "Difficulty planning steps, organising materials, managing time",
      "Better in one-to-one than in a group",
    ],
    hypotheses: [
      "Task demand above current attention span for this kind of task",
      "Sensory seeking or low arousal showing as restlessness",
      "Planning and organisation difficulty rather than motivation",
    ],
    toCheck: [
      "Attention across tasks: preferred versus non-preferred, motor versus table",
      "Teacher's report of classroom functioning",
      "Referral to the doctor if attention concerns persist across settings",
    ],
    recommendations: [
      "Short tasks with a clear end, visual checklist, timer",
      "Movement breaks scheduled between tasks",
      "Reduce distractors at the work place; seat near the teacher",
      "Teach planning aloud: what first, what next, what do I need",
    ],
  },
  {
    id: "emotional-behaviour",
    title: "Emotional reactions and behaviour during activity",
    signs: [
      "Outburst, crying or refusal during a task, cause not obvious",
      "Gives up quickly, says 'I can't', avoids challenge",
      "Insists on controlling the activity or its rules",
      "Becomes silly or provocative when the task gets harder",
    ],
    hypotheses: [
      "Task difficulty exceeds skill: avoidance protects from failure",
      "Sensory overload or accumulated arousal reaching a threshold",
      "Unpredictability or loss of control (change of plan, end of a game)",
      "Low frustration tolerance linked to fatigue, hunger or the day's events",
    ],
    toCheck: [
      "Antecedent, behaviour, consequence of each episode; when it does not happen",
      "Task level against skill: was the just-right challenge met",
    ],
    recommendations: [
      "Grade tasks to the just-right challenge so success comes first",
      "Offer controlled choices and announce changes in advance",
      "Name the feeling and the difficulty, then offer a regulation strategy",
      "Track episodes (antecedent and response) with parents and school to find patterns",
    ],
  },
];
