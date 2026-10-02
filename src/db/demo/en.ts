/**
 * English demo cabinet: an independent paediatric OT practice in north London (British
 * English, NHS and English school context: Reception, Year 1–6, SENCo, EHCP; Monday to
 * Friday). Everything is in English; the forms shipped with the app are in Hebrew, so they
 * are archived here and the practice uses its own English evaluation and mealtime
 * observation forms instead.
 */
import { sensoryProfile2Child } from "../../lib/assessments/definitions/sensory-profile-2-child";
import { date, matrix, multi, number, scale, section, single, text, textarea, yesNo } from "../../lib/forms/defaults/build";
import type { LlmForm } from "../../lib/forms/schema";
import { DEMO_CABINET_IDS } from "../demo-ids";
import { addDays, addMonths, at, day, EMPTY_TEST, s, schoolWeek, sp2Answers, sqlTimestamp, TODAY, type ChildSpec, type DemoCabinet } from "./kit";

const { workday, wd } = schoolWeek("sat-sun");

// ---------------------------------------------------------------------------
// The practice's questionnaires (English).

const SERVICES = ["Speech and language therapy", "Physiotherapy", "Psychology", "CAMHS", "Community paediatrician"];

const ANAMNESIS: LlmForm = {
  title: "Developmental History Questionnaire — Parents",
  description: "Please complete this before the first assessment. Your answers are confidential and only shared with your consent.",
  language: "en",
  sections: [
    section("Your child", [
      text("Child's full name", { identifying: true, required: true }),
      date("Date of birth", { identifying: true, required: true }),
      multi("Languages spoken at home", ["English", "Polish", "Bengali", "Turkish", "Spanish"], { other: true }),
    ]),
    section("Pregnancy and birth", [
      number("Gestation at birth", "weeks"),
      number("Birth weight", "g"),
      yesNo("Admitted to the neonatal unit"),
      textarea("If yes, how long and why"),
    ]),
    section("Early milestones", [
      date("Sat unaided (approximate date)"),
      date("First steps (approximate date)"),
      date("First words (approximate date)"),
      single("Toilet trained (daytime)", ["Yes", "In progress", "Not yet"]),
    ]),
    section("Diagnoses and services", [
      text("Diagnosis or diagnoses"),
      date("Date of diagnosis"),
      text("Diagnosed by"),
      multi("Current or past services", [...SERVICES, "Orthoptics"], { other: true }),
      date("Speech and language therapy started"),
      date("Physiotherapy started"),
      date("Last community paediatrician appointment"),
      yesNo("Regular medication"),
      text("If yes, which"),
    ]),
    section("Daily life", [
      single("Sleep", ["Good", "Hard to settle", "Frequent night waking"], { other: true }),
      textarea("Eating: what does your child eat, and what do they refuse?"),
      single("Dressing", ["Independent", "Needs a little help", "Needs a lot of help"]),
      textarea("What are your main concerns?", { required: true }),
      textarea("What are you hoping occupational therapy will help with?"),
    ]),
  ],
};

const START_OF_YEAR: LlmForm = {
  title: "Start of Year Questionnaire — Parents",
  description: "Every September, so that we can set this year's goals together.",
  language: "en",
  sections: [
    section("This year", [
      text("Year group and school"),
      text("Class teacher's name", { identifying: true }),
      yesNo("Teaching assistant support in class"),
      scale("How has the start of term gone?", 1, 5, "Very difficult", "Very well"),
    ]),
    section("Since last year", [
      textarea("What has changed?"),
      multi("New services", SERVICES, { other: true }),
      date("Date the new service started"),
      yesNo("Change in medication"),
    ]),
    section("Your priorities", [
      textarea("What would you like us to work on this year?", { required: true }),
      multi("Days that suit you for sessions", ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]),
    ]),
  ],
};

const TEACHER: LlmForm = {
  title: "Teacher Questionnaire — Classroom Function",
  description: "Parents pass this to the class teacher, who returns it to the practice.",
  language: "en",
  sections: [
    section("Class", [text("Year group"), date("Date completed")]),
    section("In class", [
      matrix(
        "Day to day, the pupil…",
        [
          "Stays seated during an activity",
          "Finishes written work in the time given",
          "Copies from the board accurately",
          "Organises their equipment",
          "Manages transitions (end of playtime, change of activity)",
          "Joins in with group work",
        ],
        ["Never", "Sometimes", "Often", "Always"],
      ),
      scale("Handwriting legibility", 1, 5, "Illegible", "Very legible"),
      multi("Adjustments already in place", ["Seat near the board", "Extra time", "Printed copies of board work", "Movement breaks", "Wobble cushion", "Laptop"], { other: true }),
    ]),
    section("Observations", [textarea("Pupil's strengths"), textarea("Difficulties observed"), textarea("Questions for the occupational therapist")]),
  ],
};

const LEVEL = ["Age-appropriate", "Mild difficulty", "Moderate difficulty", "Significant difficulty", "Not assessed"];

const EVALUATION: LlmForm = {
  title: "Initial Occupational Therapy Assessment",
  description: "Paediatric occupational therapy initial assessment.",
  language: "en",
  sections: [
    section("Reason for referral", [
      date("Assessment date", { required: true }),
      multi("Referred by", ["Parents", "Teacher / SENCo", "GP", "Community paediatrician", "Health visitor"], { other: true }),
      textarea("Reason for referral and main concerns", { required: true }),
      textarea("Parents' goals for therapy"),
    ]),
    section("Developmental and medical history", [
      yesNo("Uncomplicated pregnancy and birth"),
      yesNo("Motor milestones reached on time"),
      textarea("Medical conditions, diagnoses and medication"),
      multi("Previous or current therapies", ["Speech and language therapy", "Physiotherapy", "Psychology", "Occupational therapy"], { other: true }),
    ]),
    section("Fine motor skills", [
      single("Hand dominance", ["Right", "Left", "Not established"]),
      single("Pencil grasp", ["Palmar", "Four-finger", "Mature tripod", "Atypical"], { other: true }),
      matrix("Skills", ["Cutting with scissors", "Copying shapes", "Threading beads", "Drawing / handwriting"], LEVEL),
      textarea("Further observations"),
    ]),
    section("Gross motor skills", [
      matrix("Skills", ["Balance", "Jumping", "Throwing and catching", "Climbing", "Motor planning"], LEVEL),
      scale("Muscle tone", 1, 5, "Low", "High"),
      textarea("Further observations"),
    ]),
    section("Sensory processing", [
      matrix("Sensory responses", ["Touch", "Hearing", "Vision", "Movement (vestibular)", "Taste and smell"], ["Typical", "Under-responsive", "Over-responsive", "Seeking"]),
      textarea("Impact of sensory processing on daily life"),
    ]),
    section("Self-care", [
      matrix("Areas", ["Dressing", "Eating", "Bathing", "Toileting", "Teeth brushing"], ["Independent", "Needs some help", "Dependent on an adult"]),
      textarea("Notes"),
    ]),
    section("School and play", [
      text("Setting and year group"),
      scale("Attention and task persistence", 1, 5, "Limited", "Very good"),
      multi("Preferred play", ["Active play", "Pretend play", "Construction", "Board games", "Screens"], { other: true }),
      textarea("Play with peers and participation in the setting"),
    ]),
    section("Summary and goals", [
      textarea("Assessment summary", { required: true }),
      textarea("Therapy goals"),
      single("Recommendation", ["Occupational therapy", "Review", "No therapy needed", "Onward referral"], { required: true, other: true }),
    ]),
  ],
};

const MEALTIME: LlmForm = {
  title: "Mealtime Observation",
  description: "The occupational therapist's observation of a meal, at home, at school or in clinic.",
  language: "en",
  sections: [
    section("Mealtime context", [
      date("Observation date", { required: true }),
      single("Setting", ["Home", "Nursery / school", "Clinic"], { required: true, other: true }),
      single("Meal", ["Breakfast", "Lunch", "Tea / dinner", "Snack"]),
      multi("Present at the meal", ["Mum", "Dad", "Siblings", "School staff", "Therapist"], { other: true }),
      number("Length of the meal", "minutes"),
    ]),
    section("Seating and posture", [
      single("Seating", ["High chair", "Standard chair at a table", "Adapted chair", "On an adult's lap", "Standing / moving around"], { other: true }),
      yesNo("Feet supported"),
      scale("Trunk stability during the meal", 1, 5, "Unstable", "Very stable"),
      textarea("Notes on posture"),
    ]),
    section("Utensils and self-feeding", [
      multi("Utensils used", ["Fingers", "Spoon", "Fork", "Knife", "Open cup", "Straw cup", "Bottle"], { other: true }),
      single("Self-feeding", ["Feeds independently", "Needs some help", "Fed by an adult"], { required: true }),
      single("Preferred hand", ["Right", "Left", "Not established"]),
      textarea("Grasp of utensils and spills"),
    ]),
    section("Textures and foods", [
      matrix("Textures accepted", ["Smooth purée", "Lumpy purée", "Soft solids", "Crunchy foods", "Chewy foods (meat)", "Liquids"], ["Accepts", "Accepts with difficulty", "Refuses", "Not offered"]),
      textarea("Foods enjoyed"),
      textarea("Foods refused"),
    ]),
    section("Oral motor and sensory responses", [
      matrix("During the meal", ["Gagging", "Coughing", "Pocketing food", "Spitting food out", "Drooling"], ["Not seen", "Sometimes", "Often"]),
      scale("Chewing efficiency", 1, 5, "Weak", "Efficient"),
      yesNo("Sensitive to touch around the mouth"),
      textarea("Other sensory responses (smell, temperature, look of the food)"),
    ]),
    section("Behaviour and summary", [
      multi("Behaviour during the meal", ["Calm and cooperative", "Leaves the table", "Crying / refusal", "Needs distraction (screen, toy)", "Plays with food"], { other: true }),
      scale("Enjoyment of the meal", 1, 5, "Very little", "A lot"),
      text("Amount eaten (estimate)"),
      textarea("Summary of the observation", { required: true }),
      textarea("Recommendations"),
    ]),
  ],
};

// ---------------------------------------------------------------------------
// 1. Oliver Bennett — 4 years 3 months. Autism with severe food selectivity and sensory
// over-responsivity. Followed for 13 months, mostly around mealtimes.

const FOOD_PLAY = "Food play (touch, smell, no pressure to taste)";

function oliver(): ChildSpec {
  const birth = addMonths(TODAY, -51, 1);
  const start = wd(-396);
  const diagnosis = addMonths(birth, 34, 10);
  return {
    key: "oliver",
    child: {
      name: "Oliver Bennett",
      birthDate: birth,
      referralReason: "Severe food selectivity and sensory over-responsivity (autism)",
      schoolLevel: "Reception, with 1:1 support",
      followUpStart: start,
      medicalHistory:
        "Autism diagnosed at 2 years 10 months (child development centre, community paediatrician). Reflux in his first year. Weight monitored by the paediatrician: 9th centile, stable. Iron supplement for the past year.",
      birthHistory: "Born at 39 weeks by planned caesarean, 3.2 kg. Breastfeeding was difficult, moved to bottle feeding at 4 weeks. Weaning was hard from 6 months: refused lumps.",
      surgicalHistory: "Grommets at 2½ (glue ear).",
      geneticDiagnoses: "Microarray normal.",
      familyHistory: "A paternal cousin is autistic. Dad says he was \"very fussy\" with food as a child.",
      familyComposition: "Lives with his mum, dad and big sister (7).",
      siblingsCount: 1,
      otherInfo: "Speech and language therapy weekly at school; educational psychologist involved. EHCP in place since the summer, with a 1:1 teaching assistant. Talks in 2–3 word phrases and uses a picture schedule.",
      knownTriggers:
        "Mixed textures (lumps in mash, sauce on pasta), strong smells (fish, egg, soup), hand dryers and hairdryers, flushing in public toilets, haircuts, sticky or messy hands.",
      hyperSensitivities: ["noise", "smells", "textures", "touch", "tastes"],
      hypoReactivities: [],
      seeksDeepPressure: true,
      backgroundFactors: ["sleep", "routine", "hunger"],
      warningSigns: "Starts humming loudly, covers his ears, turns his head away from the plate, gags before he has even tasted anything.",
      calmingStrategies: ["deepPressure", "headphones", "quietCorner", "Weighted blanket", "His routine song"],
      interests: ["Trains", "Letters and numbers", "music"],
      createdAt: sqlTimestamp(at(addDays(start, -3), "09:15")),
    },
    episodes: [
      { at: [381, "12:10"], school: true, minutes: 20, kind: "difficulty", situation: "eating", antecedent: "Nursery lunch: rice mixed with peas", behavior: "Pushes the plate away, gags, leaves the table", causes: ["textures", "smells"], helped: ["Plate with sections", "removeCause"], notes: "Reported by the nursery teacher. Only ate the bread he brought from home." },
      { at: [353, "18:40"], minutes: 25, kind: "difficulty", situation: "eating", antecedent: "Tea at home: vegetable soup on the family table", behavior: "Cries as soon as he smells it, hides under the table", causes: ["smells", "mealChanges"], helped: ["Soup bowl kept at a distance", "removeCause"] },
      { at: [329, "09:30"], minutes: 35, kind: "crisis", antecedent: "Haircut at the barber's (electric clippers)", behavior: "Screams, struggles, haircut stopped halfway", causes: ["touch", "noise", "unfamiliarPlace"], helped: ["deepPressure", "Picture sequence of the haircut"], notes: "Clippers are a double problem (noise and vibration). Parents will try scissors at home, in front of a cartoon." },
      { at: [302, "12:05"], school: true, minutes: 10, kind: "difficulty", situation: "eating", antecedent: "New food offered at nursery (a rice cake)", behavior: "Agrees to touch it, refuses to put it in his mouth", causes: ["textures"], helped: [FOOD_PLAY] },
      { at: [269, "10:30"], school: true, minutes: 18, kind: "crisis", antecedent: "Birthday in class: loud music, singing and candles", behavior: "Covers his ears, shouts, throws himself on the floor", causes: ["noise", "crowd"], helped: ["headphones", "quietCorner"], notes: "Ear defenders to be ready for every celebration (1:1 TA informed)." },
      { at: [241, "19:15"], minutes: 12, kind: "difficulty", situation: "hygiene", antecedent: "Brushing teeth at bedtime", behavior: "Clamps his teeth, pushes the brush away, cries", causes: ["touch", "oralChange"], helped: ["Vibrating toothbrush he chose himself", "His routine song"] },
      { at: [206, "12:15"], school: true, minutes: 15, kind: "difficulty", situation: "eating", antecedent: "Cottage pie with small lumps", behavior: "Spits it out, wipes his tongue with his hand", causes: ["textures"], helped: ["Smooth blended mash", FOOD_PLAY] },
      { at: [169, "08:35"], school: true, minutes: 20, kind: "crisis", antecedent: "Different route to school (roadworks)", behavior: "Cries in the car, refuses to get out, hits his legs", causes: ["routineChange", "transition"], helped: ["deepPressure", "Showing a photo of the new route beforehand"] },
      { at: [141, "12:00"], school: true, minutes: 10, kind: "difficulty", situation: "eating", antecedent: "Pasta served with tomato sauce", behavior: "Refuses, repeats \"pasta on its own\"", causes: ["textures", "mealChanges"], helped: ["Sauce on the side in a small pot"], notes: "Dipped one piece of pasta in the sauce himself at the end of the meal: a first." },
      { at: [113, "18:30"], minutes: 15, kind: "difficulty", situation: "eating", antecedent: "Chicken goujons offered (new food)", behavior: "Licks one, then puts it back in the \"not yet\" section", causes: ["textures"], helped: [FOOD_PLAY, "Plate with sections"], notes: "Reached the \"lick\" step on the food ladder." },
      { at: [83, "17:10"], minutes: 15, kind: "crisis", antecedent: "Electric hand dryer in a supermarket toilet", behavior: "Panics, runs off, hides behind his mum", causes: ["noise", "unfamiliarPlace"], helped: ["headphones", "deepPressure"] },
      { at: [61, "10:00"], school: true, minutes: 8, kind: "difficulty", situation: "eating", antecedent: "Snack time: melon cut up on the shared table", behavior: "Gags at the smell, moves away from the table", causes: ["smells", "textures"], helped: ["Sitting at the end of the table, away from the plate", "removeCause"] },
      { at: [40, "19:00"], minutes: 10, kind: "difficulty", situation: "hygiene", antecedent: "Hair wash in the bath", behavior: "Screams when the water runs over his face", causes: ["touch"], helped: ["Bath visor", "Counting 1-2-3 before rinsing"] },
      { at: [25, "12:05"], school: true, minutes: 12, kind: "difficulty", situation: "eating", antecedent: "Meatballs at school lunch", behavior: "Touches and smells them, refuses to taste", causes: ["textures", "smells"], helped: [FOOD_PLAY] },
      { at: [12, "17:45"], minutes: 22, kind: "crisis", antecedent: "End of the day, no Pom-Bears left in the cupboard", behavior: "Crying, bangs his head on the sofa", causes: ["hunger", "fatigue", "routineChange"], helped: ["deepPressure", "Weighted blanket"], notes: "Very short night before (awake at 4.30am, according to his parents)." },
      { at: [5, "12:20"], school: true, minutes: 10, kind: "difficulty", situation: "eating", antecedent: "Toast fingers (new texture) at school lunch", behavior: "Tastes a small piece, holds it in his mouth, then spits it into a napkin", causes: ["textures"], helped: [FOOD_PLAY, "Allowed to spit into a napkin"], notes: "Lovely step: he tasted it on his own, without being asked." },
    ],
    forms: [
      {
        key: "anamnesis",
        template: "anamnesis",
        created: day(-405),
        sent: day(-405),
        submitted: { at: at(day(-400), "21:40"), by: "parent" },
        answers: {
          "Your child": { "Child's full name": "Oliver Bennett", "Date of birth": birth, "Languages spoken at home": ["English"] },
          "Pregnancy and birth": { "Gestation at birth": 39, "Birth weight": 3200, "Admitted to the neonatal unit": false },
          "Early milestones": {
            "Sat unaided (approximate date)": addMonths(birth, 7, 1),
            "First steps (approximate date)": addMonths(birth, 14, 10),
            "First words (approximate date)": addMonths(birth, 27, 1),
            "Toilet trained (daytime)": ["In progress"],
          },
          "Diagnoses and services": {
            "Diagnosis or diagnoses": "Autism spectrum disorder",
            "Date of diagnosis": diagnosis,
            "Diagnosed by": "Community paediatrician, child development centre",
            "Current or past services": ["Speech and language therapy", "Psychology", "Community paediatrician"],
            "Speech and language therapy started": addMonths(diagnosis, 3, 1),
            "Last community paediatrician appointment": day(-430),
            "Regular medication": false,
          },
          "Daily life": {
            Sleep: ["Frequent night waking"],
            "Eating: what does your child eat, and what do they refuse?":
              "Eats: plain pasta, white rice, white bread with no crusts, Pom-Bears, Rich Tea biscuits, plain yoghurt, smooth apple purée, smooth mash. Refuses anything with lumps, all fruit, meat, anything mixed. Only eats in front of the iPad.",
            Dressing: ["Needs a lot of help"],
            "What are your main concerns?": "He eats fewer and fewer foods and mealtimes have become a battle. The paediatrician is worried about his weight. He screams at the hairdryer and at the barber's.",
            "What are you hoping occupational therapy will help with?": "That he will try new foods and that mealtimes will be calm again.",
          },
        },
      },
      {
        key: "evaluation",
        template: "evaluation",
        created: start,
        submitted: { at: at(start, "13:20"), by: "therapist" },
        answers: {
          "Reason for referral": {
            "Assessment date": start,
            "Referred by": ["Parents", "Community paediatrician"],
            "Reason for referral and main concerns": "Severe food selectivity (about 8 foods, refuses all lumpy textures) and sensory over-responsivity. Autism diagnosed 4 months ago.",
            "Parents' goals for therapy": "A wider range of foods and calmer mealtimes at home.",
          },
          "Developmental and medical history": {
            "Uncomplicated pregnancy and birth": true,
            "Motor milestones reached on time": true,
            "Medical conditions, diagnoses and medication": "Autism. Reflux in the first year. Grommets at 2½. Iron supplement.",
            "Previous or current therapies": ["Speech and language therapy", "Psychology"],
          },
          "Fine motor skills": {
            "Hand dominance": ["Not established"],
            "Pencil grasp": ["Palmar"],
            Skills: { "Cutting with scissors": "Significant difficulty", "Copying shapes": "Moderate difficulty", "Threading beads": "Mild difficulty", "Drawing / handwriting": "Moderate difficulty" },
            "Further observations": "Avoids wet or sticky materials (play dough, finger paint) and wipes his hands straight away.",
          },
          "Gross motor skills": {
            Skills: { Balance: "Age-appropriate", Jumping: "Age-appropriate", "Throwing and catching": "Mild difficulty", Climbing: "Age-appropriate", "Motor planning": "Mild difficulty" },
            "Muscle tone": 3,
          },
          "Sensory processing": {
            "Sensory responses": { Touch: "Over-responsive", Hearing: "Over-responsive", Vision: "Typical", "Movement (vestibular)": "Seeking", "Taste and smell": "Over-responsive" },
            "Impact of sensory processing on daily life": "Over-responsive to touch, sound, taste and smell, affecting eating, bathing, toothbrushing and haircuts. Seeks deep pressure and movement.",
          },
          "Self-care": {
            Areas: { Dressing: "Dependent on an adult", Eating: "Needs some help", Bathing: "Dependent on an adult", Toileting: "Needs some help", "Teeth brushing": "Dependent on an adult" },
          },
          "School and play": {
            "Setting and year group": "School nursery class",
            "Attention and task persistence": 2,
            "Preferred play": ["Active play", "Construction"],
            "Play with peers and participation in the setting": "Mostly plays alone, lining up his trains. Little pretend play.",
          },
          "Summary and goals": {
            "Assessment summary": "3-year-old boy (3 years 2 months) with autism and severe food selectivity linked to sensory over-responsivity (touch, taste/smell, sound). Gross motor skills age-appropriate.",
            "Therapy goals": "1. Widen the range of foods (graded exposure through play). 2. Reduce over-responsivity to touch around the mouth. 3. Coaching for parents and nursery staff.",
            Recommendation: ["Occupational therapy"],
          },
        },
      },
      {
        key: "eating-1",
        template: "eating_observation",
        created: wd(-376),
        submitted: { at: at(wd(-376), "14:30"), by: "therapist" },
        answers: {
          "Mealtime context": { "Observation date": wd(-376), Setting: ["Nursery / school"], Meal: ["Lunch"], "Present at the meal": ["School staff", "Therapist"], "Length of the meal": 25 },
          "Seating and posture": { Seating: ["Standard chair at a table"], "Feet supported": false, "Trunk stability during the meal": 3, "Notes on posture": "Feet dangling, gets up from his chair every few minutes." },
          "Utensils and self-feeding": { "Utensils used": ["Fingers", "Spoon"], "Self-feeding": ["Needs some help"], "Preferred hand": ["Not established"], "Grasp of utensils and spills": "Holds the spoon in a fist, avoids touching wet food." },
          "Textures and foods": {
            "Textures accepted": { "Smooth purée": "Accepts", "Lumpy purée": "Refuses", "Soft solids": "Accepts with difficulty", "Crunchy foods": "Accepts", "Chewy foods (meat)": "Refuses", Liquids: "Accepts" },
            "Foods enjoyed": "Pom-Bears, Rich Tea biscuits, white bread without crusts, plain pasta.",
            "Foods refused": "Rice with peas, chicken, cooked vegetables, all fruit.",
          },
          "Oral motor and sensory responses": {
            "During the meal": { Gagging: "Often", Coughing: "Not seen", "Pocketing food": "Sometimes", "Spitting food out": "Often", Drooling: "Not seen" },
            "Chewing efficiency": 2,
            "Sensitive to touch around the mouth": true,
            "Other sensory responses (smell, temperature, look of the food)": "Gags at the sight and smell of mixed rice. Prefers food at room temperature.",
          },
          "Behaviour and summary": {
            "Behaviour during the meal": ["Leaves the table", "Crying / refusal"],
            "Enjoyment of the meal": 1,
            "Amount eaten (estimate)": "About a quarter of a portion (only the bread from home)",
            "Summary of the observation": "Marked food selectivity with over-responsivity to smells and mixed textures. Unstable sitting without foot support.",
            Recommendations: "Footrest, plate with sections, food play with no pressure to taste, training for nursery staff.",
          },
        },
      },
      {
        key: "eating-2",
        template: "eating_observation",
        created: wd(-35),
        submitted: { at: at(wd(-35), "13:10"), by: "therapist" },
        answers: {
          "Mealtime context": { "Observation date": wd(-35), Setting: ["Clinic"], Meal: ["Snack"], "Present at the meal": ["Mum", "Therapist"], "Length of the meal": 20 },
          "Seating and posture": { Seating: ["Adapted chair"], "Feet supported": true, "Trunk stability during the meal": 4 },
          "Utensils and self-feeding": { "Utensils used": ["Fingers", "Spoon", "Fork"], "Self-feeding": ["Feeds independently"], "Preferred hand": ["Right"] },
          "Textures and foods": {
            "Textures accepted": { "Smooth purée": "Accepts", "Lumpy purée": "Accepts with difficulty", "Soft solids": "Accepts", "Crunchy foods": "Accepts", "Chewy foods (meat)": "Accepts with difficulty", Liquids: "Accepts" },
            "Foods enjoyed": "Pom-Bears, pasta (sauce on the side too), chicken goujons, toast fingers, thin apple slices.",
            "Foods refused": "Cooked vegetables, fish, egg.",
          },
          "Oral motor and sensory responses": {
            "During the meal": { Gagging: "Sometimes", Coughing: "Not seen", "Pocketing food": "Sometimes", "Spitting food out": "Sometimes", Drooling: "Not seen" },
            "Chewing efficiency": 3,
            "Sensitive to touch around the mouth": true,
          },
          "Behaviour and summary": {
            "Behaviour during the meal": ["Calm and cooperative", "Plays with food"],
            "Enjoyment of the meal": 4,
            "Amount eaten (estimate)": "A full portion of pasta and two bites of chicken",
            "Summary of the observation": "Clear progress: about 15 accepted foods, tries a new food on his own, calm meal without a screen. Gagging less frequent.",
            Recommendations: "Continue graded exposure (cooked vegetables), keep the plate with sections, one family meal a day without a screen.",
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
          "This year": {
            "Year group and school": "Reception, Elmwood Primary School",
            "Class teacher's name": "Mrs Okafor",
            "Teaching assistant support in class": true,
            "How has the start of term gone?": 4,
          },
          "Since last year": {
            "What has changed?": "He eats lots more things now (chicken goujons, toast, apple). He's talking more. Still very hard at the barber's and with loud noises.",
            "Change in medication": false,
          },
          "Your priorities": {
            "What would you like us to work on this year?": "Vegetables, eating school dinners with the other children, brushing his teeth.",
            "Days that suit you for sessions": ["Tuesday", "Thursday"],
          },
        },
      },
    ],
    tests: [
      {
        key: "sp2-1",
        definition: sensoryProfile2Child,
        testDate: wd(-386),
        status: "completed",
        by: "parent",
        completedAfterDays: 4,
        answers: sp2Answers(
          "oliver-sp2-1",
          { SK: 1.7, AV: 3.2, SN: 3.1, RG: 1.5, none: 2.5 },
          { 1: 5, 2: 5, 5: 4, 16: 5, 18: 4, 26: 1, 42: 4, 43: 5, 44: 5, 45: 5, 46: 5, 47: 5, 59: 4, 72: 5 },
          { oral: "Only eats about ten foods, all smooth or very crunchy.", auditory: "Hairdryer, toilet flush, hoover: covers his ears." },
        ),
      },
      {
        key: "sp2-2",
        definition: sensoryProfile2Child,
        testDate: wd(-42),
        status: "completed",
        by: "parent",
        completedAfterDays: 3,
        answers: sp2Answers(
          "oliver-sp2-2",
          { SK: 1.7, AV: 2.4, SN: 2.3, RG: 1.5, none: 2.2 },
          { 1: 5, 2: 4, 16: 4, 26: 1, 42: 4, 43: 3, 44: 4, 45: 4, 46: 4, 47: 4, 72: 4 },
          { oral: "Now accepts chicken goujons, toast and apple slices." },
        ),
      },
    ],
    reports: [
      {
        key: "initial",
        docType: "initial_assessment",
        date: start,
        forms: ["anamnesis", "evaluation"],
        notes: `initial assessment, boy 3y 2m, autism dx 4 months ago. Referred by community paed + nursery
- parents: eats ~8 foods (plain pasta, white rice, white bread no crusts, Pom-Bears, Rich Tea, plain yoghurt, smooth apple purée, smooth mash). Refuses all lumps. Gags at sight/smell of some foods
- weight 9th centile, paed monitoring, iron
- meals 45 min+, only eats in front of iPad
- oral: little mouthing, toothbrushing = meltdown
- tactile: won't tolerate messy hands, play dough "yuck", wipes immediately
- auditory: covers ears for hairdryer, flush, birthday parties
- seeks deep pressure: loves tight squeezes, crashes into cushions
- GM fine. FM: palmar grasp, threads 4 beads, avoids messy materials
- play: lines up trains, little pretend play
- SP2 given to parents
- plan: weekly sessions, feeding + sensory regulation, parent coaching, food ladder, liaise with nursery`,
        variants: [
          {
            recipient: "parents",
            state: "exported",
            generated: [
              s("What we observed", "Thank you for your trust and for such a detailed questionnaire.\n\n{{child}} is a smiley little boy who loves his trains and letters. He moves well: he runs, climbs and jumps like other children his age. He still holds his crayon in his fist and avoids touching wet or sticky materials."),
              s("What he finds hard", "{{child}} experiences sounds, smells, tastes and some kinds of touch very intensely. This explains a lot of the difficulty at mealtimes:\n- he eats about 8 foods, all smooth or very crunchy\n- lumps and mixed foods make him gag\n- meals are long and happen in front of a screen\n\nToothbrushing, haircuts and some noises (hairdryer, toilet flush) are also very hard for him. Firm pressure, on the other hand, calms him."),
              s("What we will do together", "- one session a week, focused on eating and sensory regulation\n- a food ladder, never forcing him to taste\n- regular meetings with you to adapt mealtimes at home\n- liaison with the nursery team"),
            ],
            edited: [
              s("What we observed", "Thank you for your trust and for such a detailed questionnaire.\n\n{{first}} is a smiley little boy who loves his trains and letters. He moves well: he runs, climbs and jumps like other children his age. He still holds his crayon in his fist and avoids touching wet or sticky materials (play dough, paint)."),
              s("What is hard for him", "{{first}} experiences sounds, smells, tastes and some kinds of touch very intensely. This explains a lot of the difficulty at mealtimes:\n- he eats about 8 foods, all smooth or very crunchy\n- lumps and mixed foods make him gag\n- meals are long and happen in front of a screen\n\nToothbrushing, haircuts and some noises (hairdryer, toilet flush) are also very hard. Firm pressure, on the other hand, calms him: that is a real strength to build on."),
              s("What we will do together", "- one session a week, focused on eating and sensory regulation\n- a food ladder: look, touch, smell, lick, taste… never forcing\n- a meeting with you every 6 weeks to adapt mealtimes at home\n- liaison with his nursery teacher and key worker\n\nPlease bring the sensory questionnaire (Sensory Profile 2) back to me next week."),
            ],
          },
          {
            recipient: "doctor",
            state: "exported",
            generated: [
              s("Background", "Initial occupational therapy assessment of {{child}}, aged 3 years 2 months, referred by the community paediatrician and nursery for severe food selectivity. Autism diagnosed 4 months ago. Weight on the 9th centile, on an iron supplement."),
              s("Findings", "- Repertoire of about 8 foods, exclusively smooth or crunchy; refuses all lumps, gags at the sight and smell of some foods\n- Tactile, auditory and olfactory/gustatory over-responsivity; seeks deep pressure\n- Gross motor skills within normal limits; palmar grasp, avoids messy materials\n- Prolonged mealtimes (over 45 minutes) with screen distraction"),
              s("Recommendations", "Weekly occupational therapy focused on feeding (graded exposure) and sensory regulation, parent coaching and liaison with the nursery team. Sensory Profile 2 in progress. Continued weight monitoring by the paediatrician."),
            ],
          },
        ],
      },
      {
        key: "feeding-1",
        docType: "feeding_observation",
        date: wd(-376),
        forms: ["eating-1"],
        assessments: ["sp2-1"],
        notes: `lunch observation at nursery, 12pm
- standard chair, feet dangling, gets up every 3-4 min
- fisted spoon grasp, avoids touching food with fingers
- rice + peas: gags at the smell, pushes away
- only eats the bread brought from home (~1/4 portion)
- frequent gagging, spits out lumps, inefficient chewing
- SP2 (parents): avoiding and sensitivity "much more than others", oral very high
- plan: footrest, plate with sections, food play with no pressure to taste, train 1:1`,
        variants: [
          {
            recipient: "parents",
            state: "exported",
            generated: [
              s("What is going well", "The start of lunch was calm: {{child}} stayed at the table with the other children and ate his bread."),
              s("What is still hard", "- his feet don't reach the floor, so he isn't stable and gets up often\n- the rice mixed with peas upset him as soon as he smelt it, and he gagged\n- he avoids touching food and his chewing is not yet very efficient\n\nThe sensory questionnaire you completed confirms that he is much more sensitive than most children to tastes, smells and textures."),
              s("At home this week", "- a small step under his feet at mealtimes\n- a plate with sections so that foods don't touch\n- games with food (touching, smelling, sorting) without asking him to taste"),
            ],
          },
        ],
      },
      {
        key: "guidance",
        docType: "parent_guidance",
        date: wd(-151),
        notes: `parent coaching session (both parents)
- food ladder: 4 new foods accepted (chicken goujon licked, toast, apple slices, rice cake)
- evening meal without screens 3 nights/week: holding
- tricky: dad sometimes insists he "at least tries it" → meltdowns
- toothbrushing: vibrating brush ok in the morning, still hard at night
- haircut: scissors at home in front of a cartoon = success
- advice: no pressure, "discovery" food next to the plate, let him serve himself, describe foods (colour, crunch)
- next session in 6 weeks`,
        variants: [
          {
            recipient: "parents",
            state: "validated",
            generated: [
              s("What is going well", "Well done for all the work at home. {{child}} has accepted 4 new foods on his food ladder (chicken goujons, toast, apple slices, rice cakes). Screen-free evening meals, three nights a week, are going well. The haircut with scissors at home worked."),
              s("What is still hard", "When he is asked to taste something, {{child}} has a meltdown. Brushing his teeth at night is still difficult."),
              s("At home this week", "- don't ask him to taste\n- put the \"discovery\" food next to his plate\n- let him serve himself\n- describe foods with him: their colour, the noise they make when you crunch them"),
            ],
            edited: [
              s("What is going well", "Well done for all the work at home! {{first}} has accepted 4 new foods on his food ladder: chicken goujons, toast, apple slices and rice cakes. Screen-free evening meals, three nights a week, are holding up well. And the haircut with scissors at home, in front of a cartoon, was a real success."),
              s("What is still hard", "When we insist that he \"at least tries it\", {{first}} feels overwhelmed and the meltdown comes: this is completely understandable, and it is exactly why we are going one step at a time. Brushing his teeth at night, when he is tired, is still a hard moment."),
              s("At home over the next few weeks", "- stop asking him to taste: he will taste when he is ready\n- put the \"discovery\" food next to his plate, without comment\n- let him serve himself\n- play at describing foods: their colour, their smell, the noise they make when you crunch them\n\nOur next meeting is in 6 weeks."),
            ],
          },
        ],
      },
      {
        key: "feeding-2",
        docType: "feeding_observation",
        date: wd(-35),
        forms: ["eating-2"],
        assessments: ["sp2-2"],
        notes: `snack observation in clinic with mum
- adapted chair + footrest: stable trunk, sits for 20 min
- feeds himself: fingers, spoon, starting fork (right hand)
- about 15 foods accepted now
- tasted a piece of toast on his own, not asked
- less gagging, better chewing, still slow with meat
- calm, no screen, plays a little with food
- SP2 (parents): sensitivity and avoiding down, oral still "much more than others"
- plan: continue exposure (cooked veg), one screen-free family meal a day, school dinners with peers`,
        variants: [
          {
            recipient: "parents",
            state: "validated",
            generated: [
              s("What is going well", "{{child}} has made very clear progress since we started:\n- he now eats around 15 foods\n- he tasted a piece of toast on his own, without being asked\n- he stayed seated for 20 minutes, well supported in his chair with his feet on a footrest\n- he feeds himself with his fingers and a spoon, and is starting to use a fork\n\nThe sensory questionnaire also shows that sensations bother him a little less than a year ago."),
              s("What is still hard", "His mouth is still very sensitive: cooked vegetables, fish and egg are still refused, and he chews meat slowly."),
              s("At home this week", "- keep up food play, now with cooked vegetables\n- one screen-free family meal every day\n- keep the footrest and the plate with sections"),
            ],
          },
        ],
      },
      {
        key: "follow-up",
        docType: "follow_up",
        date: wd(-3),
        notes: `session
- kitchen play (salt dough): touched the dough without wiping, 5 min
- vibrating brush on cheeks then in mouth: accepts, laughs
- breadstick + hummus on the side: touches hummus with breadstick, doesn't taste
- short meltdown at the hand dryer in the corridor → ear defenders, calm in 3 min
- parents: 2 screen-free meals a day, calmer evenings
- plan: more dough play, hummus on the food ladder, ear defenders in his bag`,
        variants: [
          {
            recipient: "parents",
            state: "draft",
            generated: [
              s("What is going well", "Today {{child}} played with salt dough for 5 minutes without needing to wipe his hands, which is new. He accepted the vibrating brush on his cheeks and then in his mouth, laughing. You told us that two meals a day are now screen-free and that evenings are calmer."),
              s("What is still hard", "The noise of the hand dryer in the corridor caused a short meltdown; with his ear defenders on, he calmed down within 3 minutes. He touched the hummus with his breadstick but didn't taste it."),
              s("At home this week", "- dough games (salt dough, biscuit dough)\n- hummus next to his plate, to explore at his own pace\n- keep the ear defenders in his bag"),
            ],
          },
        ],
      },
    ],
    events: [
      { kind: "intake", date: start, time: "16:00", details: "First meeting with both parents: health record and a week of menus." },
      { kind: "report_due", date: day(-1), report: "follow-up", details: "Requested by the paediatrician before the review appointment." },
      { kind: "parent_guidance", date: wd(8), time: "17:30", details: "Meals at home: new texture introduced, chair and footrest." },
    ],
  };
}

// ---------------------------------------------------------------------------
// 2. Amelia Clarke — 7 years 4 months. Developmental coordination disorder (DCD) with
// handwriting difficulties (joined handwriting). Followed for 11 months.

function amelia(): ChildSpec {
  const birth = addMonths(TODAY, -88, 5);
  const start = wd(-331);
  return {
    key: "amelia",
    child: {
      name: "Amelia Clarke",
      birthDate: birth,
      referralReason: "Handwriting and motor clumsiness (DCD / dyspraxia)",
      schoolLevel: "Year 3",
      followUpStart: start,
      medicalHistory: "DCD (developmental coordination disorder) diagnosed by the community paediatrician 8 months ago. Mild convergence insufficiency, orthoptic exercises completed. No medication.",
      birthHistory: "Born at 38 weeks, 2.9 kg, no complications.",
      familyHistory: "Dad is left-handed and \"has always had terrible handwriting\". No other known history.",
      familyComposition: "Lives with her mum, dad and two brothers (10 and 3).",
      siblingsCount: 2,
      otherInfo: "Reads well above her age, excellent understanding and a rich vocabulary. Learning joined handwriting since Year 2. Ballet on Saturdays.",
      knownTriggers: "Long copying from the board, timed spelling tests, feeling slower than the others, laces and buttons when rushing in the morning.",
      hyperSensitivities: ["clothing"],
      hypoReactivities: ["proprioception"],
      seeksDeepPressure: false,
      backgroundFactors: ["fatigue"],
      warningSigns: "Rubs out over and over, hides her page with her arm, says \"I'm rubbish\".",
      calmingStrategies: ["break", "Breaking the task into steps", "Praising the effort"],
      interests: ["drawing", "animals", "Ballet"],
      createdAt: sqlTimestamp(at(addDays(start, -6), "10:00")),
    },
    episodes: [
      { at: [301, "19:30"], minutes: 25, kind: "difficulty", situation: "activity", antecedent: "Homework: copying 5 lines in joined handwriting", behavior: "Rubs out until the paper tears, cries", causes: ["tooDifficult", "frustration", "fatigue"], helped: ["break", "Breaking the task into steps"] },
      { at: [252, "08:00"], school: true, minutes: 15, kind: "difficulty", situation: "Getting dressed in the morning", antecedent: "Running late, shoes with laces", behavior: "Gets cross with her laces, refuses to leave", causes: ["demand", "frustration", "lossOfControl"], helped: ["Velcro shoes on school days", "Getting up 10 minutes earlier"] },
      { at: [191, "10:30"], school: true, minutes: 20, kind: "difficulty", situation: "activity", antecedent: "Timed spelling test", behavior: "Hands in an almost blank sheet, hides inside her hood", causes: ["demand", "tooDifficult"], helped: ["Extra time", "Fill-in-the-gap spelling sheet"], notes: "Reported by her class teacher." },
      { at: [149, "16:20"], school: true, minutes: 12, kind: "crisis", antecedent: "Friendship bracelets at after-school club, the others finished before her", behavior: "Throws the beads, shouts \"I'm rubbish\", cries", causes: ["frustration", "tooDifficult"], helped: ["break", "Praising the effort"] },
      { at: [94, "18:45"], minutes: 15, kind: "difficulty", situation: "activity", antecedent: "Cutting out for her costume for the end-of-year assembly", behavior: "Gives up and asks her mum to do it", causes: ["tooDifficult"], helped: ["Spring-loaded scissors", "Thicker cutting lines"] },
      { at: [18, "15:10"], school: true, minutes: 10, kind: "difficulty", situation: "activity", antecedent: "Copying homework from the board at the end of the day", behavior: "Copies only part of it, misses half the homework", causes: ["tooDifficult", "demand"], helped: ["Teacher takes a photo of the board", "Pre-printed homework diary"], notes: "Reported by her mum. Suggested asking the school for this adjustment." },
    ],
    forms: [
      {
        key: "anamnesis",
        template: "anamnesis",
        created: day(-346),
        sent: day(-346),
        submitted: { at: at(day(-339), "22:10"), by: "parent" },
        answers: {
          "Your child": { "Child's full name": "Amelia Clarke", "Date of birth": birth, "Languages spoken at home": ["English"] },
          "Pregnancy and birth": { "Gestation at birth": 38, "Birth weight": 2900, "Admitted to the neonatal unit": false },
          "Early milestones": {
            "Sat unaided (approximate date)": addMonths(birth, 8, 1),
            "First steps (approximate date)": addMonths(birth, 16, 1),
            "First words (approximate date)": addMonths(birth, 11, 1),
            "Toilet trained (daytime)": ["Yes"],
          },
          "Diagnoses and services": {
            "Current or past services": { pick: ["Orthoptics"], other: "Community paediatrician appointment requested by the GP" },
            "Regular medication": false,
          },
          "Daily life": {
            Sleep: ["Good"],
            "Eating: what does your child eat, and what do they refuse?": "Eats everything. Often knocks her drink over and struggles to cut her food.",
            Dressing: ["Needs a little help"],
            "What are your main concerns?": "Her handwriting is very hard to read and she is always the last to finish. She has started saying she is rubbish. She falls over a lot and can't ride her bike without stabilisers.",
            "What are you hoping occupational therapy will help with?": "That writing gets easier for her and that she gets her confidence back.",
          },
        },
      },
      {
        key: "evaluation",
        template: "evaluation",
        created: start,
        submitted: { at: at(addDays(start, 1), "18:30"), by: "therapist" },
        answers: {
          "Reason for referral": {
            "Assessment date": start,
            "Referred by": ["Parents", "Teacher / SENCo"],
            "Reason for referral and main concerns": "Slow, illegible handwriting, tires quickly when writing, clumsiness. Starting to show low self-esteem.",
            "Parents' goals for therapy": "Easier handwriting and more confidence.",
          },
          "Developmental and medical history": {
            "Uncomplicated pregnancy and birth": true,
            "Motor milestones reached on time": false,
            "Medical conditions, diagnoses and medication": "Mild convergence insufficiency (treated). Referred to the community paediatrician to explore DCD.",
            "Previous or current therapies": { pick: [], other: "Orthoptics" },
          },
          "Fine motor skills": {
            "Hand dominance": ["Right"],
            "Pencil grasp": { pick: [], other: "Lateral grasp with heavy pressure" },
            Skills: { "Cutting with scissors": "Moderate difficulty", "Copying shapes": "Moderate difficulty", "Threading beads": "Mild difficulty", "Drawing / handwriting": "Significant difficulty" },
            "Further observations": "Writes slowly with heavy pressure; letters vary in size and don't sit on the line. Tires after about 5 minutes.",
          },
          "Gross motor skills": {
            Skills: { Balance: "Moderate difficulty", Jumping: "Mild difficulty", "Throwing and catching": "Moderate difficulty", Climbing: "Mild difficulty", "Motor planning": "Significant difficulty" },
            "Muscle tone": 2,
            "Further observations": "Poor sitting stability, leans on the table.",
          },
          "Sensory processing": {
            "Sensory responses": { Touch: "Over-responsive", Hearing: "Typical", Vision: "Typical", "Movement (vestibular)": "Typical", "Taste and smell": "Typical" },
            "Impact of sensory processing on daily life": "Mildly bothered by labels and socks. The main difficulty is motor, not sensory.",
          },
          "Self-care": {
            Areas: { Dressing: "Needs some help", Eating: "Independent", Bathing: "Independent", Toileting: "Independent", "Teeth brushing": "Independent" },
            Notes: "Laces and small buttons are hard. Struggles to use a knife.",
          },
          "School and play": {
            "Setting and year group": "Primary school, Year 2",
            "Attention and task persistence": 4,
            "Preferred play": ["Pretend play", "Board games"],
            "Play with peers and participation in the setting": "Sociable and well liked. Avoids ball games at playtime.",
          },
          "Summary and goals": {
            "Assessment summary": "Picture consistent with DCD: difficulties with motor planning, handwriting, and fine and gross motor skills, affecting her self-esteem.",
            "Therapy goals": "1. More legible and faster handwriting. 2. An efficient pencil grasp. 3. Independence in dressing (laces, buttons). 4. Classroom adjustments.",
            Recommendation: ["Occupational therapy", "Onward referral"],
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
        testDate: wd(-323),
        status: "completed",
        by: "parent",
        completedAfterDays: 6,
        answers: sp2Answers(
          "amelia-sp2-1",
          { SK: 1.5, AV: 1.5, SN: 1.7, RG: 1.4, none: 2 },
          { 17: 4, 33: 4, 34: 4, 36: 4, 37: 4, 38: 4, 54: 4, 66: 4, 68: 4 },
          { bodyPosition: "Props her head on her hands to write, slumps quickly.", socialEmotional: "Often says she is rubbish when something doesn't work." },
        ),
      },
      { key: "sp2-2", definition: sensoryProfile2Child, testDate: wd(-5), status: "sent", answers: EMPTY_TEST },
    ],
    reports: [
      {
        key: "initial",
        docType: "initial_assessment",
        date: addDays(start, 8),
        forms: ["anamnesis", "evaluation"],
        tests: [
          { name: "ETCH (Evaluation Tool of Children's Handwriting)", results: "Manuscript legibility: words 58%, letters 66% (below the 75% functional threshold). Speed: 14 letters per minute when copying." },
          { name: "Movement ABC-2", results: "Total score at the 5th centile (red zone). Manual dexterity 2nd centile, aiming and catching 9th, balance 16th." },
          { name: "Beery VMI", results: "VMI standard score 84. Visual perception 102. Motor coordination 78." },
        ],
        notes: `initial assessment, girl 6y 5m, Year 2
- concerns: illegible, slow handwriting, always last, "I'm rubbish", falls a lot, no bike without stabilisers
- lateral pencil grasp, very heavy pressure, wrist extended
- letters vary in size, off the line, tires after ~5 min
- ETCH, MABC-2, VMI done (see results)
- dressing: laces impossible, small buttons hard
- knife: can't cut meat
- poor trunk stability in sitting, leans on elbow
- understanding and vocabulary excellent, very motivated in session
- SP2: registration "more than others" (body position), typical elsewhere
- plan: weekly sessions, pencil grip, raised-line paper, ask for extra time, refer to community paed re DCD`,
        variants: [
          {
            recipient: "parents",
            state: "exported",
            generated: [
              s("What we observed", "{{child}} is a bright, very motivated girl who understands everything she is asked. Her vocabulary is excellent.\n\nThe tests do show clear difficulties with coordinating her movements: precision with her hands, balance and catching a ball. Her handwriting is slow and hard to read: she holds her pencil from the side, presses very hard and gets tired after about 5 minutes."),
              s("What is still hard", "- writing quickly and legibly, staying on the line\n- laces, small buttons, cutting her food\n- sitting upright for long: she leans on her elbow\n\nThese difficulties are starting to affect her confidence."),
              s("What we suggest", "- one occupational therapy session a week\n- a pencil grip and raised-line exercise books\n- asking school for extra time for written work\n- an appointment with the community paediatrician, to look into these coordination difficulties"),
            ],
          },
          {
            recipient: "school",
            state: "exported",
            generated: [
              s("Background", "{{child}} has started occupational therapy this month for difficulties with motor coordination and handwriting. Her understanding is very good."),
              s("What you may notice in class", "- slow handwriting, of uneven size, that drifts off the lines\n- tiredness after a few minutes of writing\n- copying from the board that is often unfinished\n- a slumped posture, leaning on her elbow\n- frustration when she finishes after the others"),
              s("Suggested classroom adjustments", "- extra time for written work, or a reduced amount\n- printed copies instead of copying from the board\n- raised-line exercise books and a pencil grip\n- valuing content over presentation"),
            ],
          },
        ],
      },
      {
        key: "follow-up",
        docType: "follow_up",
        date: wd(-171),
        notes: `session (5 months in)
- triangular grip accepted, tripod more stable, less pressure
- print letters more even on raised-line paper
- joined handwriting started at school: joins are hard (especially from o, v, w)
- laces: bunny ears done on her own 2 out of 3 times
- trampoline + obstacle course: better balance, hops 5 times on one foot
- meltdown at after-school club (bracelets) reported by mum
- plan: 10 min/day fine motor games, joining letter by letter with animated model, balance bike`,
        variants: [
          {
            recipient: "parents",
            state: "validated",
            generated: [
              s("What is going well", "{{child}} is holding her pencil better since she started using the triangular grip, and she presses less hard. Her print letters are more even in the raised-line books. She ties the loop of her laces on her own two times out of three, and her balance is improving: she can hop 5 times on one foot."),
              s("What is still hard", "Joined handwriting, which she has started at school, takes a lot of effort, especially joining the letters. Precision activities in a group, like at after-school club, can still be too much for her."),
              s("At home this week", "- 10 minutes a day of finger games (play dough, pegs, beads)\n- joined handwriting one letter at a time, watching an animated model\n- the balance bike for her balance"),
            ],
            edited: [
              s("What is going well", "{{first}} is holding her pencil better since she started using the triangular grip, and she presses less hard, so her hand tires less quickly. Her print letters are more even in the raised-line books. She ties the loop of her laces on her own two times out of three (she loves the \"bunny ears\" method), and her balance is improving: she can hop 5 times on one foot."),
              s("What is still hard", "Joined handwriting, which she has started at school, takes a lot of effort, especially joining the letters together. Precision activities in a group, like the bracelets at after-school club, can still make her feel she has failed and doubt herself: do remind her of everything she has already learnt to do."),
              s("At home this week", "- 10 minutes a day of finger games (play dough, clothes pegs, beads)\n- joined handwriting one letter at a time, watching the animated model first\n- the balance bike in the park, for her balance"),
            ],
          },
        ],
      },
      {
        key: "year-end",
        docType: "year_end_summary",
        date: wd(-101),
        assessments: ["sp2-1"],
        tests: [{ name: "ETCH (retest)", results: "Legibility: words 79%, letters 85% (above the functional threshold). Speed: 24 letters per minute when copying." }],
        notes: `end-of-year review
- ETCH retest: legibility and speed much improved, now above the functional threshold
- stable tripod with grip, legible joined handwriting over 10 lines
- laces ok, buttons ok, knife: cuts soft foods
- riding her bike without stabilisers since Easter!
- community paed: DCD confirmed
- adjustments in place: extra time + printed copies
- confidence: says "I did it" more often
- next year (Year 3): fortnightly sessions, speed and organisation (book bag, planner), touch-typing to discuss`,
        variants: [
          {
            recipient: "parents",
            state: "exported",
            generated: [
              s("What is going well", "{{child}} has made lovely progress this year:\n- her handwriting is more legible and faster: her handwriting test results are now within the functional range\n- she writes 10 lines of legible joined handwriting\n- she does her laces and buttons on her own\n- she has been riding her bike without stabilisers since Easter\n\nThe adjustments in place at school (extra time, printed copies) help her a lot, and she says \"I did it\" more often."),
              s("What is still hard", "Her writing speed is still a little below the rest of the class, and she still needs help organising her things. The community paediatrician has confirmed the diagnosis of DCD."),
              s("Next year", "- one session every two weeks\n- working on handwriting speed and organisation (book bag, planner)\n- thinking together about touch-typing in Year 3"),
            ],
          },
        ],
      },
      {
        key: "year-start",
        docType: "year_start_summary",
        date: wd(-4),
        notes: `start of Year 3
- new class teacher, told about the adjustments (to check)
- copying homework from the board incomplete since September (mum)
- joined handwriting: kept up over the summer, 8 legible lines
- teacher questionnaire sent, not back yet
- SP2 re-assessment sent to parents
- goals this year: speed, planner, book bag, touch-typing?, pen licence later in the year`,
        variants: [],
      },
    ],
    events: [
      { kind: "intake", date: start, time: "15:00" },
      { kind: "report_due", date: day(6), report: "year-start", details: "For the school team." },
      { kind: "other", date: wd(3), time: "08:15", details: "School team meeting\nBring the start-of-year summary and the proposed handwriting adaptations." },
    ],
  };
}

// ---------------------------------------------------------------------------
// 3. Jack Thompson — 9 years 7 months. ADHD with sensory seeking; frequent meltdowns at
// school transitions (end of playtime, the dinner queue). Followed for 2 years.

const LAP = "A lap of the playground";
const HEAVY = "Heavy work (carrying the box of reading books)";
const TIMER = "Visual timer";
const WALL = "Movement break (wall push-ups)";

function jack(): ChildSpec {
  const birth = addMonths(TODAY, -115, 1);
  const start = wd(-731);
  const diagnosis = addMonths(birth, 86, 2);
  return {
    key: "jack",
    child: {
      name: "Jack Thompson",
      birthDate: birth,
      referralReason: "Sensory and behavioural regulation (ADHD), meltdowns at transitions",
      schoolLevel: "Year 5",
      followUpStart: start,
      medicalHistory: "ADHD diagnosed at 7 (community paediatrician). Slow-release methylphenidate in the morning for the past year (wears off around 3pm). Mild exercise-induced asthma, blue inhaler as needed.",
      birthHistory: "Born at 40 weeks, 3.6 kg, no complications.",
      surgicalHistory: "Broken left wrist at 6 (fell off a trampoline).",
      familyHistory: "Dad and a paternal uncle: ADHD diagnosed as adults.",
      familyComposition: "Parents separated, shared care (alternate weeks). A 2-year-old half-sister at his mum's.",
      siblingsCount: 1,
      otherInfo: "Sees a private psychologist every two weeks. Shared teaching assistant in class; SEN support plan with the SENCo. Very strong at maths. Football club on Mondays.",
      knownTriggers: "End of playtime (especially mid-game), the dinner queue, a crowded noisy playground, a change of teacher or classroom, homework late in the day once his medication has worn off.",
      hyperSensitivities: ["noise"],
      hypoReactivities: ["proprioception", "pain"],
      seeksDeepPressure: true,
      backgroundFactors: ["hunger", "fatigue", "sleep"],
      warningSigns: "Talks louder and louder, rocks on his chair, stamps his feet, looks for physical contact with others.",
      calmingStrategies: ["deepPressure", "break", HEAVY, LAP, TIMER],
      interests: ["Football", "Lego Technic", "space"],
      createdAt: sqlTimestamp(at(addDays(start, -10), "11:30")),
    },
    episodes: [
      { at: [716, "10:45"], school: true, minutes: 20, kind: "crisis", antecedent: "End of morning playtime, the bell goes", behavior: "Refuses to come in, holds on to the fence, shouts", causes: ["transition", "noise", "lossOfControl"], helped: ["break", LAP] },
      { at: [691, "12:10"], school: true, minutes: 15, kind: "crisis", antecedent: "Queue for the dinner hall, pushing and shoving", behavior: "Pushes another boy, knocks a tray over", causes: ["waiting", "crowd", "noise", "hunger"], helped: ["quietCorner", "Going in first, outside the queue"] },
      { at: [651, "08:50"], school: true, minutes: 10, kind: "difficulty", situation: "transition", antecedent: "Coming into class after the school run", behavior: "Runs down the corridor, won't settle", causes: ["transition", "seeksPressure"], helped: [HEAVY] },
      { at: [611, "13:10"], school: true, minutes: 25, kind: "crisis", antecedent: "End of lunchtime, football match cut short", behavior: "Kicks the ball at the door, swears at the PE teacher", causes: ["transition", "frustration", "lossOfControl"], helped: [TIMER, "deepPressure"], notes: "Visual timer set up 5 minutes before the end of play, with the TA." },
      { at: [561, "19:40"], minutes: 20, kind: "crisis", antecedent: "Tablet switched off, at his dad's", behavior: "Shouts, slams his bedroom door, throws his cushions", causes: ["transition", "lossOfControl", "fatigue"], helped: ["Warning at 10 and then 2 minutes", "5 minutes on the trampoline"] },
      { at: [519, "13:15"], school: true, minutes: 18, kind: "crisis", antecedent: "Back from lunch with a change of room (French lesson)", behavior: "Rolls on the floor in the corridor", causes: ["transition", "routineChange"], helped: ["deepPressure", HEAVY] },
      { at: [471, "16:10"], school: true, minutes: 30, kind: "difficulty", situation: "activity", antecedent: "Sitting-down craft at after-school club", behavior: "Keeps getting up, disturbs the others", causes: ["demand", "seeksPressure", "fatigue"], helped: ["Wobble cushion", "break"] },
      { at: [431, "10:45"], school: true, minutes: 12, kind: "crisis", antecedent: "End of playtime, he has just lost at marbles", behavior: "Tears of rage, hits the wall", causes: ["transition", "frustration"], helped: [LAP, "quietCorner"] },
      { at: [401, "12:00"], school: true, minutes: 8, kind: "difficulty", situation: "transition", antecedent: "Tidying up before lunch", behavior: "Refuses to tidy, throws the felt tips", causes: ["transition", "hunger"], helped: [TIMER, "Job: tidy-up monitor"] },
      { at: [332, "10:45"], school: true, minutes: 20, kind: "crisis", antecedent: "Rain: wet play, staying in the classroom", behavior: "Defiant, tips his chair over", causes: ["routineChange", "transition", "seeksPressure"], helped: [WALL, "deepPressure"] },
      { at: [290, "14:00"], school: true, minutes: 15, kind: "difficulty", situation: "activity", antecedent: "Christmas play rehearsal in the hall, waiting for his turn", behavior: "Climbs on the benches, won't stay in his place", causes: ["waiting", "noise", "routineChange"], helped: [HEAVY, "Job: moving the props"] },
      { at: [251, "10:50"], school: true, minutes: 15, kind: "crisis", antecedent: "End of playtime, falling out with a friend", behavior: "Pushes, refuses to come in", causes: ["transition", "frustration", "hunger"], helped: ["quietCorner", LAP] },
      { at: [141, "19:30"], minutes: 30, kind: "difficulty", situation: "activity", antecedent: "Maths homework in the evening", behavior: "Gets up 15 times, ends up under the table", causes: ["demand", "fatigue"], helped: ["Homework sitting on a gym ball", "10-minute chunks + 2-minute breaks"] },
      { at: [106, "13:00"], school: true, minutes: 25, kind: "crisis", antecedent: "End-of-year trip to the zoo, waiting for the coach in the sun", behavior: "Runs out of the line, towards the road", causes: ["waiting", "crowd", "fatigue"], helped: ["Mission: carrying the bag of balls"], notes: "Safety risk: plan a job and a named adult for every trip." },
      { at: [31, "10:45"], school: true, minutes: 20, kind: "crisis", antecedent: "First week of term, end of playtime, new teacher", behavior: "Refuses to come in, shouts that he wants his old teacher", causes: ["transition", "personChange", "routineChange"], helped: ["deepPressure", LAP] },
      { at: [27, "13:10"], school: true, minutes: 12, kind: "crisis", antecedent: "Back from lunch, very noisy corridor", behavior: "Shouts, stamps his feet, refuses to go into class", causes: ["transition", "noise"], helped: [WALL, "break"] },
      { at: [22, "16:00"], school: true, minutes: 20, kind: "difficulty", situation: "activity", antecedent: "Group activity at after-school club, medication wearing off", behavior: "Fidgets, interrupts, leaves the group", causes: ["fatigue", "demand", "hunger"], helped: ["Protein snack at 3pm", "break"] },
      { at: [17, "10:45"], school: true, minutes: 15, kind: "crisis", antecedent: "End of playtime, crowded playground (two year groups)", behavior: "Pushes in the line, refuses to move", causes: ["transition", "crowd", "noise"], helped: [TIMER, WALL] },
      { at: [14, "12:10"], school: true, minutes: 10, kind: "crisis", antecedent: "Dinner queue", behavior: "Pushes in front of everyone, shouts when sent back", causes: ["waiting", "hunger", "crowd"], helped: ["Going in first, outside the queue"] },
      { at: [10, "10:45"], school: true, minutes: 9, kind: "crisis", antecedent: "End of playtime", behavior: "Refuses to come in, throws stones", causes: ["transition", "lossOfControl"], helped: [TIMER, LAP], notes: "First time he asked for his lap of the playground himself. 4 minutes, then came in on his own." },
      { at: [7, "08:50"], school: true, minutes: 8, kind: "difficulty", situation: "transition", antecedent: "Arriving in class, PE kit left at his mum's", behavior: "Gets angry, refuses to sit down", causes: ["routineChange", "frustration"], helped: [HEAVY] },
      { at: [3, "10:45"], school: true, minutes: 6, kind: "crisis", antecedent: "Bell rings in the middle of a game", behavior: "Shouts, kicks the ball away", causes: ["transition", "frustration"], helped: [TIMER, LAP], notes: "Short meltdown (6 min). The TA used the \"I need to move\" card." },
      { at: [1, "13:10"], school: true, minutes: 5, kind: "difficulty", situation: "transition", antecedent: "From lunchtime play back to class", behavior: "Slow to come in, but comes in on his own after his lap", causes: ["transition"], helped: [LAP] },
    ],
    forms: [
      {
        key: "anamnesis",
        template: "anamnesis",
        created: day(-746),
        sent: day(-746),
        submitted: { at: at(day(-738), "21:00"), by: "parent" },
        answers: {
          "Your child": { "Child's full name": "Jack Thompson", "Date of birth": birth, "Languages spoken at home": ["English"] },
          "Pregnancy and birth": { "Gestation at birth": 40, "Birth weight": 3600, "Admitted to the neonatal unit": false },
          "Early milestones": {
            "Sat unaided (approximate date)": addMonths(birth, 6, 1),
            "First steps (approximate date)": addMonths(birth, 10, 15),
            "First words (approximate date)": addMonths(birth, 12, 1),
            "Toilet trained (daytime)": ["Yes"],
          },
          "Diagnoses and services": {
            "Diagnosis or diagnoses": "ADHD",
            "Date of diagnosis": diagnosis,
            "Diagnosed by": "Community paediatrician",
            "Current or past services": ["Psychology", "Community paediatrician"],
            "Last community paediatrician appointment": day(-761),
            "Regular medication": false,
          },
          "Daily life": {
            Sleep: ["Hard to settle"],
            "Eating: what does your child eat, and what do they refuse?": "Eats everything, very fast, often standing up.",
            Dressing: ["Independent"],
            "What are your main concerns?": "The meltdowns at school, especially after playtime: school phones us almost every week. He can't sit still and puts himself in danger.",
            "What are you hoping occupational therapy will help with?": "Strategies to help him calm down faster, at school and at home.",
          },
        },
      },
      {
        key: "evaluation",
        template: "evaluation",
        created: start,
        submitted: { at: at(start, "17:45"), by: "therapist" },
        answers: {
          "Reason for referral": {
            "Assessment date": start,
            "Referred by": ["Parents", "Teacher / SENCo"],
            "Reason for referral and main concerns": "Repeated meltdowns at school transitions (end of playtime, dinner queue), seeks movement and touch, struggles to stay seated. ADHD diagnosis.",
            "Parents' goals for therapy": "Regulation strategies and fewer meltdowns at school.",
          },
          "Developmental and medical history": {
            "Uncomplicated pregnancy and birth": true,
            "Motor milestones reached on time": true,
            "Medical conditions, diagnoses and medication": "ADHD. Mild exercise-induced asthma. Broken wrist at 6.",
            "Previous or current therapies": ["Psychology"],
          },
          "Fine motor skills": {
            "Hand dominance": ["Right"],
            "Pencil grasp": ["Mature tripod"],
            Skills: { "Cutting with scissors": "Age-appropriate", "Copying shapes": "Mild difficulty", "Threading beads": "Age-appropriate", "Drawing / handwriting": "Mild difficulty" },
            "Further observations": "Writes fast with heavy pressure, skips lines.",
          },
          "Gross motor skills": {
            Skills: { Balance: "Age-appropriate", Jumping: "Age-appropriate", "Throwing and catching": "Age-appropriate", Climbing: "Age-appropriate", "Motor planning": "Age-appropriate" },
            "Muscle tone": 3,
            "Further observations": "Takes risks when climbing, jumps from heights.",
          },
          "Sensory processing": {
            "Sensory responses": { Touch: "Seeking", Hearing: "Over-responsive", Vision: "Typical", "Movement (vestibular)": "Seeking", "Taste and smell": "Typical" },
            "Impact of sensory processing on daily life": "Marked seeking of movement and deep pressure; sensitive to noise in the playground and corridors. Meltdowns mainly happen at transitions.",
          },
          "Self-care": {
            Areas: { Dressing: "Independent", Eating: "Independent", Bathing: "Independent", Toileting: "Independent", "Teeth brushing": "Needs some help" },
          },
          "School and play": {
            "Setting and year group": "Primary school, Year 3",
            "Attention and task persistence": 2,
            "Preferred play": ["Active play", "Construction"],
            "Play with peers and participation in the setting": "Popular in ball games, but quickly gets into conflicts when a game is interrupted.",
          },
          "Summary and goals": {
            "Assessment summary": "Boy with ADHD and a sensory seeking profile (movement, touch, deep pressure) with sensitivity to noise. Meltdowns are mainly linked to transitions and waiting.",
            "Therapy goals": "1. A sensory diet at school and at home. 2. Preparing for transitions (timer, heavy work). 3. Coaching for school staff and parents.",
            Recommendation: ["Occupational therapy"],
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
          "This year": {
            "Year group and school": "Year 5, Northfield Primary School",
            "Class teacher's name": "Mr Hughes",
            "Teaching assistant support in class": true,
            "How has the start of term gone?": 2,
          },
          "Since last year": {
            "What has changed?": "New teacher (a man, very structured). Jack had several meltdowns in the first week, but he's using his \"lap of the playground\" more and more.",
            "Change in medication": true,
          },
          "Your priorities": {
            "What would you like us to work on this year?": "The end of playtime and the dinner queue. Homework in the evenings, at both our houses.",
            "Days that suit you for sessions": ["Monday", "Wednesday"],
          },
        },
      },
      {
        key: "teacher-previous",
        template: "teacher",
        cycle: "previous",
        created: day(-376),
        sent: day(-376),
        submitted: { at: at(day(-369), "16:20"), by: "parent" },
        answers: {
          Class: { "Year group": "Year 4", "Date completed": day(-370) },
          "In class": {
            "Day to day, the pupil…": {
              "Stays seated during an activity": "Sometimes",
              "Finishes written work in the time given": "Often",
              "Copies from the board accurately": "Sometimes",
              "Organises their equipment": "Never",
              "Manages transitions (end of playtime, change of activity)": "Never",
              "Joins in with group work": "Often",
            },
            "Handwriting legibility": 3,
            "Adjustments already in place": ["Seat near the board", "Movement breaks"],
          },
          Observations: {
            "Pupil's strengths": "Excellent at mental maths, generous, well liked by the others.",
            "Difficulties observed": "Coming back in from playtime is very hard (a meltdown about once a week). Starts fidgeting after 15 minutes of sitting.",
            "Questions for the occupational therapist": "What can we actually do when the bell goes?",
          },
        },
      },
      { key: "teacher", template: "teacher", cycle: "current", created: day(-12), sent: day(-12) },
    ],
    tests: [
      {
        key: "sp2-1",
        definition: sensoryProfile2Child,
        testDate: wd(-729),
        status: "completed",
        by: "parent",
        completedAfterDays: 5,
        answers: sp2Answers(
          "jack-sp2-1",
          { SK: 3.4, AV: 2.3, SN: 2.3, RG: 1.6, none: 2.5 },
          { 1: 4, 4: 5, 21: 5, 22: 4, 25: 5, 27: 5, 28: 5, 30: 5, 31: 5, 32: 4, 55: 5, 56: 5, 59: 4, 68: 4, 70: 5, 77: 5, 83: 5 },
          { movement: "Can't sit still, climbs everything, jumps off the furniture.", conduct: "Meltdowns mostly at the end of playtime, according to school." },
        ),
      },
      {
        key: "sp2-2",
        definition: sensoryProfile2Child,
        testDate: wd(-381),
        status: "completed",
        by: "therapist",
        completedAfterDays: 0,
        answers: sp2Answers(
          "jack-sp2-2",
          { SK: 2.2, AV: 1.8, SN: 1.9, RG: 1.5, none: 2.2 },
          { 4: 4, 21: 4, 25: 4, 27: 4, 28: 4, 31: 4, 55: 4, 56: 4, 70: 4, 77: 4, 83: 4 },
          { movement: "Uses his movement breaks, takes fewer risks." },
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
        notes: `initial assessment, boy 7y 7m, Year 3, ADHD dx 6 months ago, no medication yet
- school: meltdowns ~1x/week, mostly end of playtime and dinner queue
- constantly seeking movement, climbs, jumps off furniture, bumps into things without complaining
- seeks pressure: crashes into others, squeezes hard
- playground and corridor noise: covers ears then gets wound up
- fast handwriting, heavy pressure, skips lines; tripod ok
- very good gross motor skills, risk-taking
- SP2 (parents): seeking "much more than others", conduct/attention high
- plan: weekly sessions, sensory diet school + home, prepare transitions (timer, heavy work), liaise with school`,
        variants: [
          {
            recipient: "parents",
            state: "exported",
            generated: [
              s("What we observed", "{{child}} is a boy full of energy, very physically able and great company. He needs to move much more than other children: he climbs, jumps and looks for strong physical contact. The questionnaire you completed confirms this: he seeks sensations much more than most children his age."),
              s("What is still hard", "The meltdowns mainly happen at moments of change: the end of playtime and waiting in the dinner queue. The noise of the playground and corridors also seems to overwhelm him. His handwriting is fast, with very heavy pressure."),
              s("What we suggest", "- one session a week\n- a programme of movement and pressure activities through the day, at school and at home\n- preparing for the end of playtime with a timer and a physical \"job\" (carrying books, for example)\n- a conversation with the school team"),
            ],
          },
          {
            recipient: "doctor",
            state: "exported",
            generated: [
              s("Background", "Initial occupational therapy assessment of {{child}}, aged 7 years 7 months, with ADHD diagnosed 6 months ago and no medication to date. Reason for referral: repeated meltdowns at school and motor restlessness."),
              s("Findings", "- Sensory Profile 2 (caregiver questionnaire): Seeking quadrant \"much more than others\"; conduct and attentional sections elevated\n- Marked vestibular and proprioceptive seeking, under-responsive to pain, auditory over-responsivity\n- Meltdowns concentrated at school transitions (end of playtime, dinner queue)\n- Good gross motor skills with risk-taking; fast handwriting with excessive pressure"),
              s("Recommendations", "Weekly occupational therapy: a sensory programme built into the school day, preparation for transitions, parent coaching and liaison with school."),
            ],
          },
          {
            recipient: "school",
            state: "exported",
            generated: [
              s("Background", "{{child}} is starting occupational therapy. He has a strong need for movement and firm pressure to stay ready to learn, and he is quickly overwhelmed by noise."),
              s("What you may notice in class", "- restlessness after 15 minutes of seated work\n- difficulty coming in from playtime or waiting in a queue\n- visible signs of rising tension: he talks louder, rocks on his chair, stamps his feet"),
              s("Suggested classroom adjustments", "- a 5-minute warning before the end of playtime (visual timer)\n- a physical job when he comes back in: carrying the box of reading books, handing out books\n- letting him go into the dinner hall first, outside the queue\n- a movement break (wall push-ups) on an agreed signal"),
            ],
          },
        ],
      },
      {
        key: "recommendations",
        docType: "recommendations",
        date: wd(-671),
        notes: `school meeting (class teacher, TA, SENCo)
- meltdowns still at end of playtime: visual timer trialled 2 weeks = fewer meltdowns when used
- "I need to move" card suggested
- calm corner in class with weighted cushion
- dinner queue: go in first
- wobble cushion on his chair
- to put in writing for the team (SEN support plan)`,
        variants: [
          {
            recipient: "school",
            state: "exported",
            generated: [
              s("Background", "Following our meeting, here are the adjustments we agreed together for {{child}}. The visual timer trialled over the last two weeks has already reduced end-of-playtime meltdowns when it was used."),
              s("Suggested classroom adjustments", "- a visual timer 5 minutes before the bell, shown by the TA\n- an \"I need to move\" card he can put on his desk\n- a calm corner in the classroom, with a weighted cushion\n- going into the dinner hall first\n- a wobble cushion on his chair"),
            ],
          },
        ],
      },
      {
        key: "year-end",
        docType: "year_end_summary",
        date: wd(-466),
        notes: `end of Year 3
- meltdowns: from ~1/week to ~1 every 2-3 weeks
- uses the "move" card 2-3x/day
- TA uses the timer every time
- still hard: school trips, supply teachers
- medication started a month ago (paed), more available in the mornings
- next year: continue weekly, self-regulation work ("engine": slow/just right/fast)`,
        variants: [
          {
            recipient: "parents",
            state: "exported",
            generated: [
              s("What is going well", "{{child}}'s year has improved a great deal: meltdowns have gone from about one a week to one every two or three weeks. He uses his \"I need to move\" card two or three times a day, and the timer has become a routine with his TA. Since starting his medication, he is more available in the mornings."),
              s("What is still hard", "School trips and days with a supply teacher are still higher-risk moments."),
              s("Next year", "- continuing one session a week\n- learning to recognise his own energy level (his \"engine\": slow, just right, fast) and choose what to do about it"),
            ],
          },
        ],
      },
      {
        key: "home-visit",
        docType: "home_visit",
        date: wd(-241),
        notes: `home visit at dad's (shared care)
- homework on the living room table, TV on, little sister next to him
- chair too high, feet dangling
- homework around 7.30pm, medication worn off
- suggested: homework corner in his bedroom, gym ball, 10-min chunks + 2-min breaks with timer, snack first
- same tools at mum's (to pass on)`,
        variants: [
          {
            recipient: "parents",
            state: "exported",
            generated: [
              s("What we observed", "Homework is done in the evening around 7.30pm, at the living room table, with the TV on and his little sister nearby. The chair is too high: {{child}}'s feet don't reach the floor. At that time of day, his medication has worn off."),
              s("What we suggest", "- a homework corner in his bedroom, somewhere quiet\n- sitting on a gym ball\n- working in 10-minute chunks, then a 2-minute break, with a timer\n- a snack before starting\n- the same tools in both homes"),
            ],
            edited: [
              s("What we observed", "Thank you for having me. Homework is done in the evening around 7.30pm, at the living room table, with the TV on and his little sister nearby. The chair is too high: {{first}}'s feet don't reach the floor. At that time of day his medication has worn off, so he needs a calm set-up even more."),
              s("What we suggest", "- a homework corner in his bedroom, somewhere quiet\n- sitting on a gym ball (he can move without getting up)\n- working in 10-minute chunks, then a 2-minute break, with a timer\n- a snack before starting\n- the same tools in both homes: I'm happy to send this summary to his mum too if you'd like"),
            ],
          },
        ],
      },
      {
        key: "guidance",
        docType: "parent_guidance",
        date: wd(-26),
        assessments: ["sp2-2"],
        notes: `parent meeting (both, mum on video call)
- difficult start of term: 4 meltdowns in week 1 (new teacher)
- since then: asks for his "lap of the playground" himself
- dinner queue: still hard
- medication increased (paed) → calmer in the morning, rebound around 3pm at after-school club
- advice: protein snack at 3pm, "engine" card at home too, same homework routine at both houses
- review in a month`,
        variants: [
          {
            recipient: "parents",
            state: "validated",
            generated: [
              s("What is going well", "After a difficult first week with his new teacher, {{child}} now asks for his \"lap of the playground\" himself when he feels he needs it. This is real progress: he is starting to recognise his own signals."),
              s("What is still hard", "Waiting in the dinner queue is still a tense moment. Since his medication was adjusted, he is calmer in the mornings but more restless around 3pm at after-school club."),
              s("At home over the next few weeks", "- a protein-rich snack around 3pm\n- use the \"engine\" card at home too\n- the same homework routine at each of your homes"),
            ],
            edited: [
              s("What is going well", "After a difficult first week with his new teacher, {{first}} now asks for his \"lap of the playground\" himself when he feels the tension rising. This is real progress: he is starting to recognise his own signals, which is exactly this year's goal."),
              s("What is still hard", "Waiting in the dinner queue is still a tense moment. Since his medication was adjusted, he is calmer in the mornings but more restless around 3pm at after-school club, as it wears off."),
              s("At home over the next few weeks", "- a protein-rich snack around 3pm (to agree with the after-school club)\n- use the \"engine\" card at home too\n- the same homework routine at each of your homes: same time, same timer, same break\n\nWe will review things together in a month."),
            ],
          },
        ],
      },
      {
        key: "follow-up",
        docType: "follow_up",
        date: wd(-8),
        notes: `session
- arrives very wound up (straight after playtime), 5 min trampoline + heavy bag → ready
- "engine" game: identifies "fast" on arrival and "just right" after trampoline on his own
- 3-step obstacle course: done, waited his turn 2 out of 3 times
- school: 2 short meltdowns this week, comes in on his own after his lap
- plan: keep the engine card, add "lap of the playground" to his visual timetable`,
        variants: [
          {
            recipient: "parents",
            state: "exported",
            generated: [
              s("What is going well", "{{child}} arrived very wound up, straight after playtime. After 5 minutes on the trampoline and the heavy bag, he was ready to work. He recognised on his own that his \"engine\" was running fast when he arrived, and just right after the trampoline. At school, he only had two short meltdowns this week, and he goes back into class on his own after his lap of the playground."),
              s("What is still hard", "Waiting his turn is still hard: he managed it two times out of three on the obstacle course."),
              s("At home this week", "- keep using the \"engine\" card\n- add the \"lap of the playground\" to his picture timetable"),
            ],
          },
        ],
      },
    ],
    events: [
      { kind: "intake", date: start, time: "17:00" },
      { kind: "parent_guidance", date: wd(5), time: "18:00", details: "Morning routine and visual schedule; grandmother attending." },
      { kind: "other", date: wd(16), details: "Call the paediatric neurologist (treatment and tiredness in class)." },
    ],
  };
}

// ---------------------------------------------------------------------------
// 4. Isla Morgan — 5 years 4 months. Born very premature (29 weeks), motor delay and low
// muscle tone. Followed for 3 years, from nursery to Year 1.

function isla(): ChildSpec {
  const birth = addMonths(TODAY, -64, 19);
  const start = workday(addMonths(birth, 28, 4));
  const review = workday(addMonths(birth, 36, 12));
  return {
    key: "isla",
    child: {
      name: "Isla Morgan",
      birthDate: birth,
      referralReason: "Motor delay and low muscle tone (very premature birth)",
      schoolLevel: "Year 1",
      followUpStart: start,
      medicalHistory:
        "Born very premature (29+3 weeks). Mild chronic lung disease, on oxygen until 36 weeks corrected. Low axial tone and joint hypermobility. Cranial ultrasound and term MRI clear. Recurrent ear infections at 3.",
      birthHistory: "Born at 29+3 weeks by emergency caesarean (maternal pre-eclampsia), 1.18 kg. 7 weeks in the neonatal unit.",
      surgicalHistory: "Squint surgery at 3½.",
      familyComposition: "Lives with her mum, dad and little sister (2).",
      siblingsCount: 1,
      otherInfo: "NHS physiotherapy weekly since 6 months corrected age. Speech and language therapy finished last year. Yearly neonatal follow-up clinic. Corrected age taken into account until 2.",
      knownTriggers: "Tiredness at the end of the day, long walks, stairs, seats without a back, days with both physio and school.",
      hyperSensitivities: [],
      hypoReactivities: ["proprioception"],
      seeksDeepPressure: true,
      backgroundFactors: ["fatigue", "pain"],
      warningSigns: "Flops onto the table, rubs her eyes, asks to be carried, gets grumpy.",
      calmingStrategies: ["break", "deepPressure", "Changing position (ball, sitting on the floor)", "A cuddle and being carried"],
      interests: ["animals", "music", "Play dough", "Fairies"],
      createdAt: sqlTimestamp(at(addDays(start, -5), "09:00")),
    },
    episodes: [
      { at: [1003, "17:30"], minutes: 10, kind: "difficulty", situation: "activity", antecedent: "At the park, slide with a ladder", behavior: "Won't climb up, asks to be picked up", causes: ["fatigue", "tooDifficult"], helped: ["Climbing with support under her feet"] },
      { at: [882, "12:00"], minutes: 25, kind: "difficulty", situation: "eating", antecedent: "Mince at lunch", behavior: "Holds it in her mouth for a long time, then spits it out", causes: ["textures", "fatigue"], helped: ["Pulled meat in sauce", "Chair with a back and a footrest"] },
      { at: [701, "16:45"], minutes: 30, kind: "crisis", antecedent: "End of the day at nursery, ear infection (diagnosed the next day)", behavior: "Inconsolable crying, drops to the floor", causes: ["illness", "pain", "fatigue"], helped: ["A cuddle and being carried", "deepPressure"], notes: "Ear infection diagnosed by the GP the next day: always think about pain when her behaviour changes." },
      { at: [522, "08:45"], school: true, minutes: 12, kind: "difficulty", situation: "transition", antecedent: "Stairs up to the nursery (new building)", behavior: "Stops on every step, refuses to go on", causes: ["fatigue", "unfamiliarPlace"], helped: ["A handrail at her height", "Counting the steps in a song"] },
      { at: [331, "17:00"], minutes: 8, kind: "difficulty", situation: "activity", antecedent: "Bike with stabilisers", behavior: "Gives up after 2 minutes, cries", causes: ["fatigue", "frustration"], helped: ["break", "Balance bike instead of the bike"] },
      { at: [152, "16:30"], school: true, minutes: 10, kind: "difficulty", situation: "activity", antecedent: "Session: obstacle course with a balance beam", behavior: "Flops down, says \"too tired\"", causes: ["fatigue", "tooDifficult"], helped: ["Changing position (ball, sitting on the floor)", "break"], notes: "Busy end of week (physio + OT + a birthday party)." },
      { at: [24, "12:15"], school: true, minutes: 20, kind: "difficulty", situation: "eating", antecedent: "School dinner on a bench with no back", behavior: "Slumps, eats with her fingers, tires before the end", causes: ["fatigue", "movementChange"], helped: ["Chair with a back and a footrest"] },
      { at: [4, "15:20"], school: true, minutes: 15, kind: "crisis", antecedent: "Walking home from school (15 minutes)", behavior: "Sits down on the pavement, cries, refuses to go on", causes: ["fatigue", "transition"], helped: ["Buggy for the walk home on physio days", "A small snack at pick-up"] },
    ],
    forms: [
      {
        key: "anamnesis",
        template: "anamnesis",
        created: addDays(start, -12),
        sent: addDays(start, -12),
        submitted: { at: at(addDays(start, -6), "20:15"), by: "parent" },
        answers: {
          "Your child": { "Child's full name": "Isla Morgan", "Date of birth": birth, "Languages spoken at home": { pick: ["English"], other: "Welsh (with her grandparents)" } },
          "Pregnancy and birth": {
            "Gestation at birth": 29,
            "Birth weight": 1180,
            "Admitted to the neonatal unit": true,
            "If yes, how long and why": "7 weeks: prematurity, breathing support then oxygen, tube-fed for the first 4 weeks.",
          },
          "Early milestones": {
            "Sat unaided (approximate date)": addMonths(birth, 11, 15),
            "First steps (approximate date)": addMonths(birth, 22, 5),
            "First words (approximate date)": addMonths(birth, 18, 1),
            "Toilet trained (daytime)": ["Not yet"],
          },
          "Diagnoses and services": {
            "Diagnosis or diagnoses": "Motor developmental delay, low muscle tone (prematurity)",
            "Date of diagnosis": addMonths(birth, 9, 20),
            "Diagnosed by": "Neonatal follow-up clinic",
            "Current or past services": ["Physiotherapy", "Speech and language therapy", "Community paediatrician"],
            "Speech and language therapy started": addMonths(birth, 24, 1),
            "Physiotherapy started": addMonths(birth, 8, 10),
            "Last community paediatrician appointment": addMonths(birth, 26, 18),
            "Regular medication": false,
          },
          "Daily life": {
            Sleep: ["Good"],
            "Eating: what does your child eat, and what do they refuse?": "Eats everything puréed or in small soft pieces. Meat is hard for her to chew. Gets tired before the end of a meal.",
            Dressing: ["Needs a lot of help"],
            "What are your main concerns?": "She gets tired very quickly, falls over a lot and can't manage the stairs on her own yet. We want her to be ready for nursery.",
            "What are you hoping occupational therapy will help with?": "Helping her be more independent (eating, dressing) and play like other children.",
          },
        },
      },
      {
        key: "evaluation",
        template: "evaluation",
        created: start,
        submitted: { at: at(start, "12:40"), by: "therapist" },
        answers: {
          "Reason for referral": {
            "Assessment date": start,
            "Referred by": ["Community paediatrician", "Health visitor"],
            "Reason for referral and main concerns": "Very premature birth (29 weeks), motor delay and low tone. Difficulties with play, eating and independence.",
            "Parents' goals for therapy": "Independence with eating and dressing, playing like other children, getting ready for nursery.",
          },
          "Developmental and medical history": {
            "Uncomplicated pregnancy and birth": false,
            "Motor milestones reached on time": false,
            "Medical conditions, diagnoses and medication": "Prematurity (29 weeks, 1.18 kg), mild chronic lung disease, low axial tone, hypermobility.",
            "Previous or current therapies": ["Physiotherapy", "Speech and language therapy"],
          },
          "Fine motor skills": {
            "Hand dominance": ["Not established"],
            "Pencil grasp": ["Palmar"],
            Skills: { "Cutting with scissors": "Not assessed", "Copying shapes": "Significant difficulty", "Threading beads": "Moderate difficulty", "Drawing / handwriting": "Moderate difficulty" },
            "Further observations": "Unstable shoulder and wrist; prefers to play lying on her tummy.",
          },
          "Gross motor skills": {
            Skills: { Balance: "Significant difficulty", Jumping: "Significant difficulty", "Throwing and catching": "Moderate difficulty", Climbing: "Significant difficulty", "Motor planning": "Moderate difficulty" },
            "Muscle tone": 1,
            "Further observations": "Walks on a wide base, falls often, climbs stairs holding a hand.",
          },
          "Sensory processing": {
            "Sensory responses": { Touch: "Typical", Hearing: "Typical", Vision: "Typical", "Movement (vestibular)": "Under-responsive", "Taste and smell": "Typical" },
            "Impact of sensory processing on daily life": "Proprioceptive under-responsivity; enjoys deep pressure and bouncing on a ball.",
          },
          "Self-care": {
            Areas: { Dressing: "Dependent on an adult", Eating: "Needs some help", Bathing: "Dependent on an adult", Toileting: "Dependent on an adult", "Teeth brushing": "Dependent on an adult" },
          },
          "School and play": {
            "Setting and year group": "Childminder, three days a week",
            "Attention and task persistence": 3,
            "Preferred play": ["Pretend play", "Construction"],
            "Play with peers and participation in the setting": "Parallel play; avoids active games outside.",
          },
          "Summary and goals": {
            "Assessment summary": "Toddler of 2 years 4 months (born at 29 weeks) with gross and fine motor delay linked to low tone, affecting play and independence.",
            "Therapy goals": "1. Trunk and shoulder stability in play. 2. Independent spoon feeding. 3. Construction and pretend play. 4. Parent coaching and adaptations at home.",
            Recommendation: ["Occupational therapy"],
          },
        },
      },
      { key: "back-to-school", template: "backToSchool", cycle: "current", created: day(-40) },
    ],
    tests: [
      {
        key: "sp2-1",
        definition: sensoryProfile2Child,
        testDate: wd(-372),
        status: "completed",
        by: "parent",
        completedAfterDays: 5,
        answers: sp2Answers(
          "isla-sp2-1",
          { SK: 1.6, AV: 1.3, SN: 1.4, RG: 2.6, none: 2 },
          { 33: 5, 34: 4, 35: 4, 36: 5, 37: 5, 38: 5, 39: 5, 40: 4, 41: 5, 42: 4, 53: 4, 57: 4 },
          { bodyPosition: "Tires quickly standing, leans on everything, lies down on the table." },
        ),
      },
      {
        key: "sp2-2",
        definition: sensoryProfile2Child,
        testDate: wd(-2),
        status: "draft",
        answers: sp2Answers("isla-sp2-2", { SK: 1.6, AV: 1.3, SN: 1.4, RG: 2.3, none: 2 }, { 33: 4, 36: 4, 37: 4, 38: 4, 39: 4, 41: 5 }, {}, 41),
      },
    ],
    reports: [
      {
        key: "initial",
        docType: "initial_assessment",
        date: addDays(start, 7),
        forms: ["anamnesis", "evaluation"],
        tests: [{ name: "PDMS-2 (Peabody Developmental Motor Scales)", results: "Total motor quotient: 72 (3rd centile). Gross motor: 70. Fine motor: 79." }],
        notes: `initial assessment, girl 2y 4m (corrected 2y 1m), ex-29 weeker
- walking since 22 months, wide base, falls often
- stairs: up holding a hand, down on her bottom
- W-sitting on the floor, tires quickly, prefers playing on her tummy
- FM: palmar grasp, stacks 3 blocks, simple inset puzzles ok
- meals: spoon with help, soft pieces ok, meat hard, tires by end of meal
- PDMS-2: TMQ 72
- play: emerging pretend play (feeds her doll), loves singing
- plan: weekly sessions, liaise with physio, adapted chair + footrest, play in supported positions (kneeling, standing at a table)`,
        variants: [
          {
            recipient: "parents",
            state: "exported",
            generated: [
              s("What we observed", "{{child}} is a cheerful little girl who loves singing and is starting to play pretend: she feeds her doll. She has been walking since she was 22 months old, with her feet wide apart for balance, and still falls quite often. Her muscles are soft and floppy: she tires quickly and prefers to play lying on her tummy."),
              s("What is still hard", "- going up and down stairs\n- sitting upright on the floor or on a chair\n- using her hands precisely: she still grasps things with her whole hand\n- chewing meat, and finishing a meal without getting tired"),
              s("What we suggest", "- one session a week, linked with her physiotherapist\n- an adapted chair with a footrest for mealtimes\n- games kneeling or standing at a table, to strengthen her back and shoulders"),
            ],
          },
          {
            recipient: "doctor",
            state: "exported",
            generated: [
              s("Background", "Initial occupational therapy assessment of {{child}}, aged 2 years 4 months (corrected age 2 years 1 month), born at 29+3 weeks (1.18 kg), receiving physiotherapy since 6 months corrected age."),
              s("Findings", "- PDMS-2: total motor quotient 72 (3rd centile); gross motor 70, fine motor 79\n- Axial hypotonia, hypermobility; walking from 22 months on a wide base, frequent falls\n- Palmar grasp; marked fatigability, including at mealtimes"),
              s("Recommendations", "Weekly occupational therapy coordinated with physiotherapy: proximal stability, fine motor skills, independence at mealtimes, seating adaptations."),
            ],
          },
        ],
      },
      {
        key: "home-visit",
        docType: "home_visit",
        date: workday(addDays(start, 40)),
        notes: `home visit
- meals in a high chair with no footrest, slumps after 10 min
- toys stored up high, she has to ask
- bathroom: wobbly step stool
- suggested: footrest (adjustable board), toys in floor-level boxes, non-slip step with handles, small cushion behind her back`,
        variants: [
          {
            recipient: "parents",
            state: "exported",
            generated: [
              s("What we observed", "Thank you for having us. At mealtimes, {{child}} sits in her high chair with nothing under her feet: after about ten minutes, she slumps. Her toys are stored up high, and the bathroom step moves under her feet."),
              s("What we suggest", "- an adjustable board under her feet in the high chair\n- a small cushion behind her back\n- toy boxes at floor level that she can open herself\n- a non-slip step stool with handles"),
            ],
          },
        ],
      },
      {
        key: "three-year-review",
        docType: "follow_up",
        date: review,
        tests: [{ name: "Developmental review at 3 years (neonatal follow-up clinic)", results: "Gross motor around 24 months, fine motor and play around 30 months, language age-appropriate." }],
        notes: `review at 3 years (with the neonatal clinic results)
- progress in every area over 6 months, especially pretend play and construction
- gross motor still the most delayed area
- stairs: up with alternating feet, holding the rail
- feeds herself with a spoon, starting a fork
- starting nursery in September: chair with a back and arms, rest times`,
        variants: [
          {
            recipient: "parents",
            state: "exported",
            generated: [
              s("What is going well", "The developmental review shows that {{child}} has progressed in every area over the last six months, especially in pretend play and building. She now climbs the stairs with alternating feet, holding the rail, and feeds herself with a spoon."),
              s("What is still hard", "Movement games (running, climbing, jumping) are still the area where she is furthest behind other children her age."),
              s("For starting nursery", "- a chair with a back and arms\n- rest times built into her day\n- I can meet the nursery team before she starts if you would like"),
            ],
          },
        ],
      },
      {
        key: "year-end-1",
        docType: "year_end_summary",
        date: wd(-466),
        tests: [{ name: "PDMS-2 (retest)", results: "Total motor quotient: 81 (10th centile). Gross motor: 78. Fine motor: 88." }],
        notes: `end of nursery year
- PDMS-2 retest: TMQ 81 (was 72)
- jumps with feet together, stands on one foot for 3 s
- cuts along a straight line, emerging tripod
- dressing: puts on trousers and T-shirt herself, not shoes
- still very tired at the end of the day, physio continuing
- next year (Reception): pre-writing, toileting and dressing, balance bike`,
        variants: [
          {
            recipient: "parents",
            state: "exported",
            generated: [
              s("What is going well", "What a year for {{child}}! The motor test shows lovely progress, especially in her hand skills. She jumps with her feet together, stands on one foot for 3 seconds, cuts along a straight line and is starting to hold her pencil between three fingers. She puts on her trousers and T-shirt on her own."),
              s("What is still hard", "She is still very tired at the end of the day, and shoes still need help."),
              s("Next year", "- drawing and first shapes\n- independence with the toilet and dressing\n- the balance bike, together with her physiotherapist"),
            ],
          },
        ],
      },
      {
        key: "year-end-2",
        docType: "year_end_summary",
        date: wd(-101),
        assessments: ["sp2-1"],
        notes: `end of Reception
- draws a person (head, body, arms), copies a cross and a square
- dresses fully on her own except laces; dry in the day
- SP2 (parents): registration "much more than others", body position high, seeking typical
- balance bike ok, bike with stabilisers 2 min
- tiredness: still asks to be carried home from school
- next year (Year 1): pre-writing, stamina, keep adapted chair`,
        variants: [
          {
            recipient: "parents",
            state: "exported",
            generated: [
              s("What is going well", "{{child}} now draws a person with a head, a body and arms, and copies a cross and a square. She dresses herself completely, apart from laces, and she is dry during the day. She rides her balance bike."),
              s("What is still hard", "The sensory questionnaire shows that she picks up less information from her body (position, effort) than other children, which partly explains her tiredness: she still asks to be carried home from school."),
              s("Next year", "- preparing for writing (lines, shapes)\n- building stamina\n- keeping an adapted chair at school"),
            ],
            edited: [
              s("What is going well", "Another wonderful year for {{first}}! She now draws a person with a head, a body and arms, and copies a cross and a square. She dresses herself completely (apart from laces) and she is dry during the day. She rides her balance bike very proudly."),
              s("What is still hard", "The sensory questionnaire you completed shows that she picks up less information from her body than other children (her position, the effort in her muscles). This partly explains her tiredness: she still asks to be carried home from school, and she is not just being lazy."),
              s("Next year (Year 1)", "- getting ready for writing: lines, shapes, pencil grip\n- building stamina, together with her physiotherapist\n- keeping an adapted chair at school (a back and something under her feet)"),
            ],
          },
        ],
      },
      {
        key: "year-start",
        docType: "year_start_summary",
        date: wd(-20),
        notes: `start of Year 1
- settled well, class teacher informed (chair with a back provided)
- school dinners on a bench with no back → slumps, request made to school
- tired on the walk home on physio days → buggy on those days
- goals: pre-writing (tripod, shapes), cutting, stamina, phonics handwriting in Year 1
- SP2 to repeat in October`,
        variants: [
          {
            recipient: "parents",
            state: "validated",
            generated: [
              s("What is going well", "{{child}} has settled well into Year 1. Her class teacher knows about her needs, and a chair with a back has been put in the classroom."),
              s("What is still hard", "At lunchtime she sits on a bench with no back and slumps; we have asked the school about this. On physio days, the walk home tires her out."),
              s("This year's goals", "- getting ready for writing: pencil grip, shapes\n- cutting\n- stamina\n- keeping up with handwriting in Year 1\n\nOn physio days, a buggy for the walk home may help."),
            ],
          },
        ],
      },
    ],
    events: [
      { kind: "intake", date: start, time: "10:30" },
      { kind: "report_due", date: day(-3), report: "year-start", details: "For the school coordinator." },
      { kind: "parent_guidance", date: wd(10), time: "16:30", details: "Play at home: ideas for pretend play." },
      { kind: "other", date: day(21), details: "Ask the GP to renew the therapy referral." },
    ],
  };
}

export const en: DemoCabinet = {
  key: "en",
  ids: DEMO_CABINET_IDS.en,
  language: "en",
  weekend: "sat-sun",
  therapistName: "Sarah Whitfield",
  account: {
    name: "Whitfield Children's Occupational Therapy",
    letterhead: "Sarah Whitfield — Paediatric Occupational Therapist (MSc OT)\n27 Highbury Grove, London N5\nTel. 020 7946 0381 · demo-en@ergo-ai.app\nHCPC registration OT61842",
    schoolYearStart: "09-01",
  },
  builtinForms: "archive",
  templates: [
    { key: "anamnesis", source: ANAMNESIS, file: "Developmental-history-parents.docx", kind: "docx", createdDaysAgo: 1098, autoAssign: false, tokens: [3010, 2210] },
    { key: "evaluation", source: EVALUATION, file: "Initial-OT-assessment.docx", kind: "docx", createdDaysAgo: 1097, autoAssign: false, tokens: [3840, 2950] },
    { key: "eating_observation", source: MEALTIME, file: "Mealtime-observation.pdf", kind: "pdf", createdDaysAgo: 1090, autoAssign: false, tokens: [3460, 2580] },
    { key: "teacher", source: TEACHER, file: "Teacher-questionnaire.pdf", kind: "pdf", createdDaysAgo: 402, autoAssign: false, deadlineInDays: 9, tokens: [4730, 1610] },
    { key: "backToSchool", source: START_OF_YEAR, file: "Start-of-year-questionnaire.docx", kind: "docx", createdDaysAgo: 46, autoAssign: true, deadlineInDays: -6, tokens: [2210, 1370] },
  ],
  children: () => [oliver(), amelia(), jack(), isla()],
};
