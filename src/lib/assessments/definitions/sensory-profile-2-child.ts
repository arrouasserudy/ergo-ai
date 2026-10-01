import { bandOf, rangeLabel, sumOf, type Range } from "../scoring";
import type { AssessmentAnswers, AssessmentDefinition, AssessmentSection, RatingChoice, ScoreRow } from "../types";

// Sensory Profile 2 — Child, Caregiver Questionnaire (W. Dunn, © 2014 NCS Pearson),
// 3:0 to 14:11. 86 items rated 5 (Almost Always) to 1 (Almost Never), 0 = Does Not
// Apply. Section raw scores add up their items (15 and 86 excepted); quadrant raw
// scores add up the items of the Quadrant Grid (p. 7). Each total is classified with the
// ranges of the Summary Scores page (p. 8). Percentile ranges need the manual and are
// not computed.

type Quadrant = "SK" | "AV" | "SN" | "RG";
type Item = [number, Quadrant | null, string];

const SCALE: RatingChoice[] = [
  { value: 5, label: "Almost Always", short: "AA" },
  { value: 4, label: "Frequently", short: "F" },
  { value: 3, label: "Half the Time", short: "HT" },
  { value: 2, label: "Occasionally", short: "O" },
  { value: 1, label: "Almost Never", short: "AN" },
  { value: 0, label: "Does Not Apply", short: "NA" },
];

const BANDS = ["Much Less Than Others", "Less Than Others", "Just Like the Majority of Others", "More Than Others", "Much More Than Others"];

type SectionSpec = { id: string; title: string; label: string; max: number; ranges: Range[]; items: Item[]; excluded?: number[]; behavioral?: boolean };

const SECTIONS: SectionSpec[] = [
  {
    id: "auditory",
    title: "AUDITORY Processing",
    label: "Auditory",
    max: 40,
    ranges: [[0, 2], [3, 9], [10, 24], [25, 31], [32, 40]],
    items: [
      [1, "AV", "reacts strongly to unexpected or loud noises (for example, sirens, dog barking, hair dryer)."],
      [2, "AV", "holds hands over ears to protect them from sound."],
      [3, "SN", "struggles to complete tasks when music or TV is on."],
      [4, "SN", "is distracted when there is a lot of noise around."],
      [5, "AV", "becomes unproductive with background noise (for example, fan, refrigerator)."],
      [6, "SN", "tunes me out or seems to ignore me."],
      [7, "SN", "seems not to hear when I call his or her name (even though hearing is OK)."],
      [8, "RG", "enjoys strange noises or makes noise(s) for fun."],
    ],
  },
  {
    id: "visual",
    title: "VISUAL Processing",
    label: "Visual",
    max: 30,
    ranges: [[0, 4], [5, 8], [9, 17], [18, 21], [22, 30]],
    excluded: [15],
    items: [
      [9, "SN", "prefers to play or work in low lighting."],
      [10, null, "prefers bright colors or patterns for clothing."],
      [11, null, "enjoys looking at visual details in objects."],
      [12, "RG", "needs help to find objects that are obvious to others."],
      [13, "SN", "is more bothered by bright lights than other same-aged children."],
      [14, "SK", "watches people as they move around the room."],
      [15, "AV", "is bothered by bright lights (for example, hides from sunlight through car window).*"],
    ],
  },
  {
    id: "touch",
    title: "TOUCH Processing",
    label: "Touch",
    max: 55,
    ranges: [[0, 0], [1, 7], [8, 21], [22, 28], [29, 55]],
    items: [
      [16, "SN", "shows distress during grooming (for example, fights or cries during haircutting, face washing, fingernail cutting)."],
      [17, null, "becomes irritated by wearing shoes or socks."],
      [18, "AV", "shows an emotional or aggressive response to being touched."],
      [19, "SN", "becomes anxious when standing close to others (for example, in a line)."],
      [20, "SN", "rubs or scratches a part of the body that has been touched."],
      [21, "SK", "touches people or objects to the point of annoying others."],
      [22, "SK", "displays need to touch toys, surfaces, or textures (for example, wants to get the feeling of everything)."],
      [23, "RG", "seems unaware of pain."],
      [24, "RG", "seems unaware of temperature changes."],
      [25, "SK", "touches people and objects more than same-aged children."],
      [26, "RG", "seems oblivious to messy hands or face."],
    ],
  },
  {
    id: "movement",
    title: "MOVEMENT Processing",
    label: "Movement",
    max: 40,
    ranges: [[0, 1], [2, 6], [7, 18], [19, 24], [25, 40]],
    items: [
      [27, "SK", "pursues movement to the point it interferes with daily routines (for example, can't sit still, fidgets)."],
      [28, "SK", "rocks in chair, on floor, or while standing."],
      [29, null, "hesitates going up or down curbs or steps (for example, is cautious, stops before moving)."],
      [30, "SK", "becomes excited during movement tasks."],
      [31, "SK", "takes movement or climbing risks that are unsafe."],
      [32, "SK", "looks for opportunities to fall with no regard for own safety (for example, falls down on purpose)."],
      [33, "RG", "loses balance unexpectedly when walking on an uneven surface."],
      [34, "RG", "bumps into things, failing to notice objects or people in the way."],
    ],
  },
  {
    id: "bodyPosition",
    title: "BODY POSITION Processing",
    label: "Body Position",
    max: 40,
    ranges: [[0, 0], [1, 4], [5, 15], [16, 19], [20, 40]],
    items: [
      [35, "RG", "moves stiffly."],
      [36, "RG", "becomes tired easily, especially when standing or holding the body in one position."],
      [37, "RG", "seems to have weak muscles."],
      [38, "RG", "props to support self (for example, holds head in hands, leans against a wall)."],
      [39, "RG", "clings to objects, walls, or banisters more than same-aged children."],
      [40, "RG", "walks loudly as if feet are heavy."],
      [41, "SK", "drapes self over furniture or on other people."],
      [42, null, "needs heavy blankets to sleep."],
    ],
  },
  {
    id: "oral",
    title: "ORAL SENSORY Processing",
    label: "Oral",
    max: 50,
    // No "Much Less Than Others" range for this section.
    ranges: [null, [0, 7], [8, 24], [25, 32], [33, 50]],
    items: [
      [43, null, "gags easily from certain food textures or food utensils in mouth."],
      [44, "SN", "rejects certain tastes or food smells that are typically part of children's diets."],
      [45, "SN", "eats only certain tastes (for example, sweet, salty)."],
      [46, "SN", "limits self to certain food textures."],
      [47, "SN", "is a picky eater, especially about food textures."],
      [48, "SK", "smells nonfood objects."],
      [49, "SK", "shows a strong preference for certain tastes."],
      [50, "SK", "craves certain foods, tastes, or smells."],
      [51, "SK", "puts objects in mouth (for example, pencil, hands)."],
      [52, "SN", "bites tongue or lips more than same-aged children."],
    ],
  },
  {
    id: "conduct",
    title: "CONDUCT Associated With Sensory Processing",
    label: "Conduct",
    max: 45,
    behavioral: true,
    ranges: [[0, 1], [2, 8], [9, 22], [23, 29], [30, 45]],
    items: [
      [53, "RG", "seems accident-prone."],
      [54, "RG", "rushes through coloring, writing, or drawing."],
      [55, "SK", "takes excessive risks (for example, climbs high into a tree, jumps off tall furniture) that compromise own safety."],
      [56, "SK", "seems more active than same-aged children."],
      [57, "RG", "does things in a harder way than is needed (for example, wastes time, moves slowly)."],
      [58, "AV", "can be stubborn and uncooperative."],
      [59, "AV", "has temper tantrums."],
      [60, "SK", "appears to enjoy falling."],
      [61, "AV", "resists eye contact from me or others."],
    ],
  },
  {
    id: "socialEmotional",
    title: "SOCIAL EMOTIONAL Responses Associated With Sensory Processing",
    label: "Social Emotional",
    max: 70,
    behavioral: true,
    ranges: [[0, 2], [3, 12], [13, 31], [32, 41], [42, 70]],
    items: [
      [62, "RG", "seems to have low self-esteem (for example, difficulty liking self)."],
      [63, "AV", "needs positive support to return to challenging situations."],
      [64, "AV", "is sensitive to criticisms."],
      [65, "AV", "has definite, predictable fears."],
      [66, "AV", "expresses feeling like a failure."],
      [67, "AV", "is too serious."],
      [68, "AV", "has strong emotional outbursts when unable to complete a task."],
      [69, "SN", "struggles to interpret body language or facial expression."],
      [70, "AV", "gets frustrated easily."],
      [71, "AV", "has fears that interfere with daily routines."],
      [72, "AV", "is distressed by changes in plans, routines, or expectations."],
      [73, "SN", "needs more protection from life than same-aged children (for example, defenseless physically or emotionally)."],
      [74, "AV", "interacts or participates in groups less than same-aged children."],
      [75, "AV", "has difficulty with friendships (for example, making or keeping friends)."],
    ],
  },
  {
    id: "attentional",
    title: "ATTENTIONAL Responses Associated With Sensory Processing",
    label: "Attentional",
    max: 50,
    behavioral: true,
    ranges: [[0, 0], [1, 8], [9, 24], [25, 31], [32, 50]],
    excluded: [86],
    items: [
      [76, "RG", "misses eye contact with me during everyday interactions."],
      [77, "SN", "struggles to pay attention."],
      [78, "SN", "looks away from tasks to notice all actions in the room."],
      [79, "RG", "seems oblivious within an active environment (for example, unaware of activity)."],
      [80, "RG", "stares intensively at objects."],
      [81, "AV", "stares intensively at people."],
      [82, "SK", "watches everyone when they move around the room."],
      [83, "SK", "jumps from one thing to another so that it interferes with activities."],
      [84, "SN", "gets lost easily."],
      [85, "RG", "has a hard time finding objects in competing backgrounds (for example, shoes in a messy room, pencil in \"junk drawer\")."],
      [86, "RG", "seems unaware when people come into the room.*"],
    ],
  },
];

const QUADRANTS: { id: Quadrant; label: string; max: number; ranges: Range[] }[] = [
  { id: "SK", label: "Seeking/Seeker", max: 95, ranges: [[0, 6], [7, 19], [20, 47], [48, 60], [61, 95]] },
  { id: "AV", label: "Avoiding/Avoider", max: 100, ranges: [[0, 7], [8, 20], [21, 46], [47, 59], [60, 100]] },
  { id: "SN", label: "Sensitivity/Sensor", max: 95, ranges: [[0, 6], [7, 17], [18, 42], [43, 53], [54, 95]] },
  { id: "RG", label: "Registration/Bystander", max: 110, ranges: [[0, 6], [7, 18], [19, 43], [44, 55], [56, 110]] },
];

const itemId = (n: number) => `i${n}`;
const ALL_ITEMS = SECTIONS.flatMap((s) => s.items);

/** Item ids counted in each section's raw score (items marked * are left out). */
export const SECTION_ITEMS: Record<string, string[]> = Object.fromEntries(
  SECTIONS.map((s) => [s.id, s.items.filter(([n]) => !s.excluded?.includes(n)).map(([n]) => itemId(n))]),
);

/** Item ids of each quadrant, from the quadrant tag printed next to each item. */
export const QUADRANT_ITEMS: Record<Quadrant, string[]> = Object.fromEntries(
  QUADRANTS.map((q) => [q.id, ALL_ITEMS.filter(([, tag]) => tag === q.id).map(([n]) => itemId(n))]),
) as Record<Quadrant, string[]>;

function scoreRow(answers: AssessmentAnswers, id: string, label: string, ids: string[], max: number, ranges: Range[]): ScoreRow {
  const { value, missing } = sumOf(answers, ids);
  // A total is classified only when every item has an answer.
  return { id, label, value, max, unit: "points", missing, band: missing ? null : bandOf(value, ranges), ranges: ranges.map(rangeLabel) };
}

const sections: AssessmentSection[] = SECTIONS.map((s) => ({
  id: s.id,
  title: s.title,
  lead: "My child…",
  scale: SCALE,
  comments: true,
  items: s.items.map(([number, , text]) => ({ kind: "rating", id: itemId(number), number, text })),
  ...(s.excluded ? { note: `* This item is not part of the ${s.label.toUpperCase()} Raw Score.` } : {}),
}));

export const sensoryProfile2Child: AssessmentDefinition = {
  id: "sensory-profile-2-child",
  version: 1,
  name: "Child Sensory Profile 2 — Caregiver Questionnaire",
  shortName: "Sensory Profile 2",
  summaryGroup: "quadrants",
  language: "en",
  respondents: ["therapist", "parent"],
  ageRange: { minMonths: 36, maxMonths: 179 },
  instructions: [
    "The pages that follow contain statements that describe how children may act. Please read each phrase and select the option that best describes how often your child shows these behaviors. Please mark one option for every statement.",
    "Almost Always: 90% or more of the time. Frequently: 75% of the time. Half the Time: 50% of the time. Occasionally: 25% of the time. Almost Never: 10% or less of the time.",
    "If you are unable to answer because you have not observed the behavior or believe that it does not apply to your child, please check Does Not Apply.",
  ].join("\n"),
  sections,

  score(answers) {
    const sectionRow = (s: SectionSpec) => scoreRow(answers, s.id, s.label, SECTION_ITEMS[s.id], s.max, s.ranges);
    return [
      { id: "quadrants", title: "Quadrants", bands: BANDS, rows: QUADRANTS.map((q) => scoreRow(answers, q.id, q.label, QUADRANT_ITEMS[q.id], q.max, q.ranges)) },
      { id: "sensory", title: "Sensory Sections", bands: BANDS, rows: SECTIONS.filter((s) => !s.behavioral).map(sectionRow) },
      { id: "behavioral", title: "Behavioral Sections", bands: BANDS, rows: SECTIONS.filter((s) => s.behavioral).map(sectionRow) },
    ];
  },
};
