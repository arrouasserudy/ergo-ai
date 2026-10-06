import type { DocTypeGuide, OtRule } from "./types";

/**
 * How an experienced pediatric OT reasons from session notes, in English for the model.
 * DRAFT: content awaits review by a professional pediatric OT.
 */
export const REASONING_RULES: OtRule[] = [
  { id: "tie-to-observation", text: "Every hypothesis or recommendation starts from a specific observation in the notes; name that observation." },
  {
    id: "task-demand",
    text: "To explain a behaviour, look at the context: what happened just before, the sensory, motor, cognitive and regulatory demands of the task, the setting and the time.",
  },
  { id: "competing-hypotheses", text: "When the cause is unclear, give two plausible explanations rather than one, and say what would tell them apart." },
  { id: "what-to-check", text: "For each hypothesis, say what to observe, ask or assess next to confirm or rule it out." },
  { id: "age-norms", text: "Compare skills with what is expected at the child's age; do not treat age-typical behaviour as a difficulty." },
  { id: "strengths", text: "Start from strengths and interests, and use them in recommendations (motivation, the just-right challenge)." },
  {
    id: "occupation-based",
    text: "Recommendations are occupation-based and concrete: what to do, how often, who does it, where (clinic, home, school), in the child's daily routines.",
  },
  { id: "family-centred", text: "Recommendations are realistic for a family's daily life: few, short, embedded in routines, never several new tasks at once." },
  { id: "no-blame", text: "Never suggest that parents, teachers or caregivers caused a difficulty; describe the child's needs and what helps." },
  { id: "no-diagnosis", text: "Never diagnose or name a disorder the notes do not give; describe functional patterns ('a pattern compatible with…' only when well grounded)." },
  {
    id: "medical-flags",
    text: "Pain, choking, weight loss, regression, seizures, sleep or toileting problems with a possible medical cause: recommend checking with the doctor.",
  },
  { id: "multi-disciplinary", text: "When a difficulty crosses into speech, psychology, vision or medicine, suggest coordination with that professional rather than advising in their field." },
  { id: "measurable-goals", text: "Goals are observable and measurable (what the child will do, in which context, how often), in the spirit of SMART goals." },
];

/** Expected structure per document type (section names in English; the model translates them). */
export const DOC_TYPE_GUIDES: DocTypeGuide[] = [
  {
    docType: "follow_up",
    sections: ["Session focus", "Observations", "Progress", "Current difficulties", "Recommendations / next steps"],
    notes: "Short. Describe what was worked on and observed today, compared with earlier sessions when the notes say so.",
  },
  {
    docType: "initial_assessment",
    sections: ["Reason for referral", "Background", "Assessment tools", "Findings by domain", "Summary", "Recommendations"],
    notes: "Findings grouped by domain (sensory, motor, fine motor, self-care, play, behaviour). The summary links findings to daily functioning.",
  },
  {
    docType: "feeding_observation",
    sections: ["Context of the meal", "Posture and seating", "Oral-motor skills", "Sensory responses to food", "Mealtime behaviour", "Recommendations"],
    notes: "Note foods offered and accepted. Any choking or coughing is reported to the doctor.",
  },
  {
    docType: "home_visit",
    sections: ["Purpose of the visit", "Home environment", "Daily routines observed", "Adaptations suggested"],
    notes: "Adaptations are practical and specific to the home described.",
  },
  {
    docType: "parent_guidance",
    sections: ["Topics discussed", "Parents' questions", "Strategies agreed", "Follow-up"],
    notes: "Reflects what was agreed together with the parents.",
  },
  {
    docType: "year_start_summary",
    sections: ["Background", "Current functioning", "Goals for the year", "Intervention plan"],
    notes: "Goals are measurable and linked to school and home participation.",
  },
  {
    docType: "year_end_summary",
    sections: ["Background", "Goals and progress", "Current functioning", "Recommendations for next year"],
    notes: "For each goal: reached, partly reached or not yet, with the evidence from the notes.",
  },
  {
    docType: "recommendations",
    sections: ["Context", "Recommendations at home", "Recommendations at school"],
    notes: "Each recommendation is concrete and directly usable.",
  },
];
