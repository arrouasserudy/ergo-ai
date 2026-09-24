/**
 * Pediatric OT topics for the open-access corpus (PubMed Central, English queries).
 * Every query is restricted to licenses that allow commercial reuse (CC BY / CC0).
 */
export const TOPICS: { key: string; query: string }[] = [
  { key: "sensory", query: '("sensory processing"[tiab] OR "sensory modulation"[tiab] OR "sensory integration"[tiab] OR "sensory over-responsivity"[tiab])' },
  { key: "autism-behavior", query: '(autism[tiab] OR autistic[tiab]) AND ("challenging behavior"[tiab] OR "challenging behaviour"[tiab] OR meltdown*[tiab] OR "self-regulation"[tiab] OR "emotion regulation"[tiab])' },
  { key: "fine-motor", query: '(handwriting[tiab] OR "fine motor"[tiab] OR graphomotor[tiab] OR "visual-motor"[tiab])' },
  { key: "dcd", query: '("developmental coordination disorder"[tiab] OR dyspraxia[tiab])' },
  { key: "feeding", query: '("feeding difficult*"[tiab] OR "picky eating"[tiab] OR "food selectivity"[tiab] OR "avoidant/restrictive food intake"[tiab] OR ARFID[tiab])' },
  { key: "adhd", query: '(ADHD[tiab] OR "attention-deficit"[tiab]) AND ("occupational therapy"[tiab] OR "motor"[tiab] OR "sensory"[tiab] OR "classroom"[tiab])' },
  { key: "cerebral-palsy", query: '("cerebral palsy"[tiab]) AND ("upper limb"[tiab] OR "hand function"[tiab] OR "occupational therapy"[tiab] OR "participation"[tiab])' },
  { key: "self-care", query: '("activities of daily living"[tiab] OR "self-care"[tiab] OR dressing[tiab] OR toileting[tiab] OR "sleep problems"[tiab])' },
  { key: "school", query: '("school-based"[tiab] OR classroom[tiab] OR "school participation"[tiab]) AND ("occupational therapy"[tiab] OR accommodation*[tiab] OR "sensory"[tiab])' },
  { key: "ot-general", query: '("occupational therapy"[tiab] OR "occupational therapist*"[tiab])' },
];

/** Applied to every topic: children, reusable license. */
export const COMMON_FILTER =
  '(child*[tiab] OR pediatric[tiab] OR paediatric[tiab] OR adolescen*[tiab]) AND ("cc by license"[filter] OR "cc0 license"[filter])';
