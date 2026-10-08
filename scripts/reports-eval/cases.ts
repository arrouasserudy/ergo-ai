import type { ReportDocType, ReportTest } from "@/db/schema";
import type { Locale } from "@/i18n";

/** A realistic, anonymized session to draft a report from (no real child). */
export type EvalCase = {
  id: string;
  language: Locale;
  docType: ReportDocType;
  /** Pseudonymized child context, as the report prompt receives it. */
  child: { birthDate: string; referralReason: string; schoolLevel: string | null; followUpStart: string | null; interests: string[] };
  sessionDate: string;
  notes: string;
  tests: ReportTest[];
};

/** Fictional cases. Several include an episode whose cause the notes do not state, to test hypotheses. */
export const CASES: EvalCase[] = [
  {
    // The example of the OT's documentation spec: raw notes in, clinical wording out, no added facts.
    id: "he-cutting-spec-example",
    language: "he",
    docType: "follow_up",
    child: { birthDate: "2020-11-02", referralReason: "מוטוריקה עדינה, הכנה לכיתה א'", schoolLevel: "גן חובה", followUpStart: "2026-01-15", interests: ["רכבות"] },
    sessionDate: "2026-09-21",
    notes: "היום הוא התקשה בגזירה. היה לו קשה להחזיק את הדף ולגזור לפי הקו. הייתי צריכה לעזור לו הרבה. אחרי שהצלחנו הוא רצה לעשות עוד פעם.",
    tests: [],
  },
  {
    // Gaze difficulty: ideas for therapy and, apart, points to follow; a referral only as the team judges.
    id: "he-gaze-follow-up",
    language: "he",
    docType: "follow_up",
    child: { birthDate: "2021-06-18", referralReason: "קשב, מוטוריקה עדינה", schoolLevel: "גן טרום חובה", followUpStart: "2026-03-01", interests: ["בועות סבון", "חיות"] },
    sessionDate: "2026-09-28",
    notes: `מפגש 8
- בועות סבון: עוקב אחרי בועה 2-3 שנ' ומאבד, מזיז את כל הראש
- פאזל 12 חלקים: מסיט מבט כל כמה שניות, מתקרב מאוד לדף
- משפשף עיניים פעמיים במהלך המפגש
- תפיסת כדור גדול: מצליח 2 מ-6
- אמא: גם בבית "לא מסתכל כשמראים לו משהו"
- מוטיבציה טובה, שיתוף פעולה טוב`,
    tests: [],
  },
  {
    id: "he-asd-meltdown-follow-up",
    language: "he",
    docType: "follow_up",
    child: { birthDate: "2021-03-10", referralReason: "ASD, ויסות חושי, מעברים", schoolLevel: "גן חובה", followUpStart: "2025-11-01", interests: ["מכוניות", "מספרים"] },
    sessionDate: "2026-09-14",
    notes: `מפגש 14
- הגיע מהגן ישר, אבא: יום עם הרבה רעש, היה יום הולדת
- התחלנו בנדנדה 5 דק' - נהנה, ביקש עוד
- מסלול: עבר 2 סיבובים, בשלישי שכב על המזרן
- שולחן: השחלת חרוזים 6, אחר כך הדבקה עם דבק - סירב לגעת
- כשהודעתי שמחליפים פעילות - צרח, נשכב על הרצפה, בעט, ~6 דק'
- נרגע עם שמיכה כבדה ושיר מספרים
- סוף: בירך לשלום, יצא רגוע`,
    tests: [],
  },
  {
    id: "he-dcd-handwriting-follow-up",
    language: "he",
    docType: "follow_up",
    child: { birthDate: "2018-06-22", referralReason: "קושי בכתיבה ובתיאום מוטורי", schoolLevel: "כיתה ב'", followUpStart: "2026-01-15", interests: ["כדורגל", "לגו"] },
    sessionDate: "2026-09-10",
    notes: `- כתיבה: העתקה מהלוח 2 שורות ב-8 דק', רווחים לא אחידים, יורד מהשורה
- אחיזה: אגודל עוטף, לוחץ חזק, מנער את היד
- ישיבה: שוקע בכיסא, ראש על היד
- כדור: תפיסה ב-2 ידיים 6/10, זריקה למטרה לא מדויקת
- קשירת שרוכים - לא מצליח, "אמא קושרת"
- מורה: לא מסיים העתקות, נשאר בהפסקה להשלים
- עבדנו: משטח משופע, גריפ - שיפור קל בלחץ`,
    tests: [],
  },
  {
    id: "he-feeding-observation",
    language: "he",
    docType: "feeding_observation",
    child: { birthDate: "2023-11-05", referralReason: "בררנות אכילה, משקל נמוך", schoolLevel: "פעוטון", followUpStart: null, interests: ["בועות סבון"] },
    sessionDate: "2026-09-08",
    notes: `תצפית ארוחת ערב בבית
- כיסא אוכל, רגליים תלויות, מחליק למטה
- אוכל: פירה, יוגורט, ביסלי. לא מסכים לעוף, ירקות
- עוף חתוך - גאגינג מהמגע בשפתיים, בכה
- לועס בתנועות למעלה-למטה, מחזיק אוכל בלחי
- ארוחה 50 דק', טאבלט מול הפנים
- אמא: מדי פעם משתעל כשאוכל לחם
- להציע: הדום, הפסקת מסך, משחק עם אוכל`,
    tests: [],
  },
  {
    id: "he-sensory-initial",
    language: "he",
    docType: "initial_assessment",
    child: { birthDate: "2020-08-30", referralReason: "רגישות חושית, קושי בגן", schoolLevel: "גן חובה", followUpStart: null, interests: ["ציור", "חיות"] },
    sessionDate: "2026-09-03",
    notes: `הערכה ראשונית
הפניה: גננת + הורים
- הור': לא מסכימה לחפוף ראש, בוכה בתספורת, לובשת רק בגדים בלי תוויות
- בגן: לא משתתפת בשירה בקבוצה, מתרחקת כשיש רעש
- מו"ג: קופצת, מטפסת, שיווי משקל טוב
- מו"ע: אחיזת שלוש, גוזרת קו ישר, מעתיקה ריבוע
- נמנעת מחול, ניגבה ידיים 4 פעמים בפלסטלינה
- מחפשת לחץ: נכנסה מתחת לכריות "תמעכי אותי"
- משחק סמלי תואם גיל
- SP2 הורים`,
    tests: [{ name: "SP2 הורים", results: "רגישות: הרבה יותר מאחרים; הימנעות: יותר מאחרים; חיפוש: כמו רוב; רישום: כמו רוב" }],
  },
  {
    id: "he-attention-year-start",
    language: "he",
    docType: "year_start_summary",
    child: { birthDate: "2017-02-14", referralReason: "קשב, ארגון, כתיבה", schoolLevel: "כיתה ד'", followUpStart: "2025-09-01", interests: ["מדע", "אופניים"] },
    sessionDate: "2026-09-07",
    notes: `סיכום תחילת שנה
- שנה שעברה: שיפור בכתב יד, קריאות טובה יותר, עדיין איטי
- תיק: מגיע בלי חומרים, שוכח שיעורי בית
- בשיעור: קם, משחק בחפצים, זקוק לתזכורות
- מבחנים: לא מסיים בזמן
- הורים: שיעורי בית שעה+ עם ויכוחים
- אבחון נוירולוג לפני 3 ח' (טיפול תרופתי - לא צוין)
- מטרות? ארגון, קצב כתיבה, עצמאות בשיעורי בית`,
    tests: [],
  },
  {
    id: "he-parent-guidance-sleep",
    language: "he",
    docType: "parent_guidance",
    child: { birthDate: "2022-04-18", referralReason: "ASD, שגרות יום", schoolLevel: "גן תקשורת", followUpStart: "2025-10-10", interests: ["רכבות"] },
    sessionDate: "2026-09-11",
    notes: `הדרכת הורים
- אמא + אבא
- שינה: נרדם 22:30, מתעורר 2-3 פעמים, צריך שיחזרו לשכב לידו
- בוקר: התלבשות 30 דק', מתנגד לגרביים
- מקלחת: צורח כשמים על הראש
- דיברנו: לוח שגרה בתמונות, לחץ עמוק לפני שינה, גרביים בלי תפרים, כוס להרטבת ראש מלפנים
- הורים: מותשים, ביקשו דבר אחד להתחיל איתו
- סיכמנו: לוח שגרת ערב קודם`,
    tests: [],
  },
  {
    id: "he-praxis-crisis-follow-up",
    language: "he",
    docType: "follow_up",
    child: { birthDate: "2019-10-02", referralReason: "תיאום מוטורי, תכנון תנועה", schoolLevel: "כיתה א'", followUpStart: "2026-03-01", interests: ["גיבורי על", "טיפוס"] },
    sessionDate: "2026-09-15",
    notes: `- מסלול חדש (4 תחנות) - עמד מבולבל, "מה עושים?", אחרי הדגמה עשה 2 תחנות
- ביקש לחזור למסלול של שבוע שעבר - עשה מצוין
- זחילה במנהרה, קפיצת צפרדע - לא מתואם
- כפתורים בחולצה: 2 מתוך 5
- באמצע הסידור של הקוביות לפי דגם - הפיל הכל, צעק "אני טיפש", הסתתר מתחת לשולחן
- יצא אחרי כמה דקות, לא רצה לחזור לקוביות
- סיום עם משחק כדור - שמח`,
    tests: [],
  },
  {
    id: "he-year-end-fine-motor",
    language: "he",
    docType: "year_end_summary",
    child: { birthDate: "2020-12-12", referralReason: "מוטוריקה עדינה, מוכנות לכיתה א'", schoolLevel: "גן חובה", followUpStart: "2025-09-15", interests: ["בישול", "בובות"] },
    sessionDate: "2026-06-25",
    notes: `סיכום שנה
מטרות מתחילת השנה:
1. אחיזת שלוש בעיפרון - הושג ברוב הזמן, מתעייפת אחרי 10 דק'
2. גזירת עיגול - הושג חלקית, סוטה בקימורים
3. כתיבת שם - הושג, אותיות בגודל אחיד יחסית
4. כפתורים - הושג בכפתורים גדולים
- ציור אדם: 6 חלקים
- גננת: משתתפת ביצירה, מסיימת משימות
- VMI ספטמבר: 88, יוני: 97
- להמשיך? מעבר לכיתה א'`,
    tests: [{ name: "VMI", results: "ספטמבר 2025: ציון תקן 88; יוני 2026: ציון תקן 97" }],
  },
  {
    id: "fr-sensory-follow-up",
    language: "fr",
    docType: "follow_up",
    child: { birthDate: "2019-05-20", referralReason: "Troubles de la modulation sensorielle, opposition", schoolLevel: "CE1", followUpStart: "2025-12-01", interests: ["dinosaures", "piscine"] },
    sessionDate: "2026-09-16",
    notes: `Séance 11
- arrivée en pleurs, maman : dispute dans la voiture
- balançoire 5 min puis hamac : se calme
- parcours : saute à pieds joints 10x, unipodal 3 s
- graphisme : boucles irrégulières, se plaint du bruit de la ventilation
- au moment de ranger : refus, crie, jette les cerceaux (~4 min)
- calme avec gilet lesté + respiration "bougie"
- à voir : casque anti-bruit en classe ?`,
    tests: [],
  },
  {
    id: "fr-home-visit",
    language: "fr",
    docType: "home_visit",
    child: { birthDate: "2021-01-08", referralReason: "Retard des acquisitions motrices, autonomie", schoolLevel: "Grande section", followUpStart: "2026-02-01", interests: ["Lego", "voitures"] },
    sessionDate: "2026-09-09",
    notes: `VAD 17h-18h
- chambre partagée avec grand frère, beaucoup de jouets au sol
- bureau trop haut, pieds dans le vide
- habillage : enfile pantalon assis par terre, tee-shirt à l'envers 2/3
- toilettes : marchepied absent, ne s'essuie pas seul
- goûter : couteau non utilisé, renverse le verre
- parents demandent comment l'aider le matin
- propositions : bac de rangement par catégorie, marchepied, réhausseur, tableau du matin`,
    tests: [],
  },
  {
    id: "en-autism-initial",
    language: "en",
    docType: "initial_assessment",
    child: { birthDate: "2022-07-01", referralReason: "Autism, play skills, feeding concerns", schoolLevel: "Preschool", followUpStart: null, interests: ["water play", "letters"] },
    sessionDate: "2026-09-04",
    notes: `Initial eval
- parents: dx autism 6 mo ago, ~12 foods, no mixed textures
- lines up letters, spins wheels, limited pretend play
- GM: runs, climbs, avoids swing, toe walking at times
- FM: palmar grasp on crayon, stacks 6 blocks, threads 2 beads
- tactile: avoided shaving foam, accepted water beads
- covered ears when hand dryer started next door
- engaged 15 min w/ letter puzzle, turn-taking 2 turns w/ support
- plan? weekly OT, parent coaching, feeding`,
    tests: [],
  },
  {
    id: "en-recommendations-school",
    language: "en",
    docType: "recommendations",
    child: { birthDate: "2016-09-19", referralReason: "Handwriting, attention, sensory seeking", schoolLevel: "Grade 5", followUpStart: "2025-10-01", interests: ["basketball", "drawing comics"] },
    sessionDate: "2026-09-12",
    notes: `Recs for school mtg
- teacher: rocks chair, taps pencil, out of seat often
- writing: legible but slow, 9 wpm copy, fatigue after 10 min
- does well w/ movement breaks in clinic (wall push-ups, carrying books)
- chews shirt collar
- likes to doodle while listening
- ideas: wobble cushion, chewable, movement jobs, typing for long texts, extra time, reduced copying`,
    tests: [],
  },
];
