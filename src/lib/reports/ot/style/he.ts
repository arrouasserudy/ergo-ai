import type { StyleGuide } from "../types";

/**
 * Hebrew professional register of Israeli pediatric OT reports.
 * DRAFT: all content (rules, vocabulary, phrasing, model reports) awaits review by a
 * professional OT before it is relied on. Model reports are fully fictional.
 */
export const STYLE: StyleGuide = {
  register: [
    {
      id: "impersonal",
      text: 'Use the impersonal, observational register of Hebrew clinical reports: "נצפה כי", "ניכר", "בולט", "עולה כי", "נמצא", "במהלך הטיפול נראה כי". Recommendations start with "מומלץ" or "מומלץ להמשיך".',
    },
    { id: "third-person", text: "Write in the third person about the child ({{child}}), never addressing the child. The therapist does not write in the first person singular except in the parents version (\"נשמח\", \"בטיפול עבדנו על\" is acceptable)." },
    {
      id: "gender",
      text: "Hebrew verbs and adjectives agree with the child's gender: follow the notes (בן/בת, הוא/היא, verb forms). When the gender is unknown, prefer impersonal or noun forms (\"נצפתה הימנעות\", \"קיים קושי ב…\") over guessing.",
    },
    {
      id: "expand-abbreviations",
      text: 'Expand the therapist\'s abbreviations: מו"ע → מוטוריקה עדינה, מו"ג → מוטוריקה גסה, ת"ת → תכנון תנועה, ב"ס → בית הספר, ח\' → חודשים, דק\' → דקות, הור\' → הורים. Keep standard test acronyms (SP2, VMI, MABC-2, BOT-2) in Latin letters.',
    },
    { id: "numbers", text: "Write ages as \"בן 5 ו-3 חודשים\" / \"בת 5 ו-3 חודשים\", frequencies as \"פעם בשבוע\", scores exactly as given with the test name." },
    { id: "no-slang", text: 'No slang, no exclamation marks, no emojis, no English words when a standard Hebrew professional term exists (ויסות, not "רגולציה" in a parents report).' },
    { id: "sentences", text: "Sentences of moderate length, one idea each; avoid long chains joined by \"ו\". Paragraphs of 2 to 4 sentences." },
    {
      id: "parents-tone",
      text: "Parents version: professional yet warm and clear. Explain each term in everyday words the first time (\"ויסות חושי, כלומר היכולת להתאים את התגובה לגירויים\"). Start with strengths, be honest about difficulties, end with concrete steps at home.",
    },
    { id: "hedging", text: 'Hypotheses are worded as possibilities: "ייתכן כי", "ניתן לשער כי", "נראה כי … עשוי לנבוע מ…". Observations are stated plainly.' },
    { id: "headings", text: "Section headings are short Hebrew nouns: \"רקע\", \"סיבת הפנייה\", \"ממצאים\", \"התרשמות כללית\", \"סיכום והמלצות\"." },
  ],
  glossary: [
    { id: "visut-hushi", term: "ויסות חושי", meaning: "sensory modulation", avoid: "רגישות לדברים" },
    { id: "tguvatiyut-yeter", term: "תגובתיות יתר (רגישות יתר)", meaning: "sensory over-responsivity" },
    { id: "tguvatiyut-hesser", term: "תגובתיות חסר", meaning: "sensory under-responsivity / low registration" },
    { id: "hipus-hushi", term: "חיפוש תחושתי", meaning: "sensory seeking", avoid: "הוא כל הזמן מחפש ריגושים" },
    { id: "hamaa-tactilit", term: "הימנעות טקטילית", meaning: "tactile avoidance", avoid: "לא אוהב ללכלך ידיים" },
    { id: "proprioceptzia", term: "תחושה פרופריוצפטיבית", meaning: "proprioception (body position sense)" },
    { id: "vestibulari", term: "מערכת וסטיבולרית", meaning: "vestibular system (balance and movement)" },
    { id: "lahatz-amok", term: "לחץ עמוק", meaning: "deep pressure input" },
    { id: "diata-hushit", term: "דיאטה חושית", meaning: "sensory diet", avoid: "תרגילים להרגעה" },
    { id: "visut-atzmi", term: "ויסות עצמי", meaning: "self-regulation" },
    { id: "ramat-irur", term: "רמת עירור", meaning: "arousal level" },
    { id: "praxis", term: "תכנון תנועה (פרקסיס)", meaning: "motor planning, praxis" },
    { id: "koordinatzia-bilateralit", term: "קואורדינציה דו-צדדית", meaning: "bilateral coordination" },
    { id: "yatzivut-proximalit", term: "יציבות פרוקסימלית", meaning: "proximal stability (trunk, shoulder girdle)" },
    { id: "shlita-posturalit", term: "שליטה יציבתית", meaning: "postural control" },
    { id: "sivolet", term: "סבולת", meaning: "endurance", avoid: "מתעייף מהר מאוד" },
    { id: "ahiza", term: "אחיזה", meaning: "grasp (אחיזה אגרופית, אחיזת שלוש, אחיזת ארבע)" },
    { id: "dominantiyut", term: "דומיננטיות ידנית", meaning: "hand dominance" },
    { id: "manipulatzia", term: "מניפולציה תוך-ידנית", meaning: "in-hand manipulation" },
    { id: "integratzia-vizuo-motorit", term: "אינטגרציה ויזו-מוטורית", meaning: "visual-motor integration" },
    { id: "tfisa-hazutit", term: "תפיסה חזותית", meaning: "visual perception" },
    { id: "grafomotorika", term: "גרפומוטוריקה", meaning: "graphomotor skills, pre-writing and writing" },
    { id: "motorika-oralit", term: "מוטוריקה אוראלית", meaning: "oral-motor skills" },
    { id: "repertuar-mazon", term: "רפרטואר מזון מצומצם", meaning: "limited food repertoire", avoid: "בררן באוכל" },
    { id: "refleks-hakaa", term: "רפלקס הקאה", meaning: "gag reflex" },
    { id: "adl", term: "תפקודי יום-יום (ADL)", meaning: "activities of daily living" },
    { id: "mischak-simli", term: "משחק סמלי", meaning: "symbolic / pretend play" },
    { id: "kashav", term: "קשב וריכוז", meaning: "attention and concentration" },
    { id: "tifkudim-nihuliyim", term: "תפקודים ניהוליים", meaning: "executive functions" },
    { id: "sibolet-tiskul", term: "סבולת לתסכול", meaning: "frustration tolerance", avoid: "מתעצבן מהר" },
    { id: "hatama-svivatit", term: "התאמות סביבתיות", meaning: "environmental adaptations" },
    { id: "hadrachat-horim", term: "הדרכת הורים", meaning: "parent guidance" },
    { id: "etgar-mutam", term: "אתגר מותאם", meaning: "just-right challenge" },
  ],
  phrasing: [
    { id: "lo-yoshev", avoid: "הוא לא מסוגל לשבת בשקט", prefer: "ניכר קושי לשמור על ישיבה לאורך זמן" },
    { id: "lo-ohev", avoid: "היא לא אוהבת ללכלך את הידיים", prefer: "נצפתה הימנעות ממגע בחומרים רטובים ודביקים" },
    { id: "hishtagea", avoid: "הוא השתגע באמצע הטיפול", prefer: "במהלך הטיפול נצפתה התפרצות רגשית" },
    { id: "atzlan", avoid: "הוא עצלן בכתיבה", prefer: "כתיבה ממושכת כרוכה עבורו במאמץ רב ובעייפות" },
    { id: "meshaamem", avoid: "הוא משתעמם מהר", prefer: "משך הקשב למשימות שולחן קצר ביחס לגילו" },
    { id: "lo-mekshiv", avoid: "היא לא מקשיבה", prefer: "נדרשו מספר תזכורות מילוליות כדי להתחיל במשימה" },
    { id: "beseder", avoid: "המוטוריקה הגסה בסדר", prefer: "המוטוריקה הגסה תואמת את הגיל" },
    { id: "gaver", avoid: "הוא ממש גרוע בגזירה", prefer: "בגזירה ניכר קושי בתיאום בין שתי הידיים" },
    { id: "hitkadem-meod", avoid: "היא התקדמה מלא", prefer: "ניכרת התקדמות משמעותית ב…" },
    { id: "tzarich", avoid: "צריך לעשות איתו תרגילים בבית", prefer: "מומלץ לשלב בבית פעילות של … פעמיים ביום, כחמש דקות" },
    { id: "boche", avoid: "הוא בוכה על כל דבר", prefer: "נצפתה סבולת נמוכה לתסכול בעת שינוי בפעילות" },
    { id: "mevin", avoid: "הוא לא מבין מה רוצים ממנו", prefer: "נדרשו הדגמה ופירוק המשימה לשלבים" },
    { id: "metzuyan", avoid: "הייתה עבודה מצוינת!!", prefer: "שיתוף הפעולה היה טוב לאורך כל המפגש" },
    { id: "hiperaktivi", avoid: "הוא היפראקטיבי", prefer: "נצפתה תנועתיות מוגברת ומעברים תכופים בין פעילויות" },
    { id: "mefuzar", avoid: "היא מפוזרת", prefer: "ניכר קושי בארגון החומרים ובתכנון שלבי המשימה" },
    { id: "lo-normali", avoid: "האחיזה לא נורמלית", prefer: "האחיזה בעיפרון אינה בשלה ביחס לגיל" },
  ],
  examples: [
    {
      id: "he-follow-up-parents",
      docType: "follow_up",
      notes: `מפגש 9, בן 6 ו-4 ח', כיתה א'
- הגיע עייף, אמא: קם 5:30
- מסלול מכשולים: טיפס יפה, בקפיצה על רגל אחת מאבד שיווי משקל אחרי 3
- גזירה בקו ישר - מצליח, בעיגול סוטה, מסובב את הדף עם היד החזקה
- כתיבת שם: אותיות בגדלים שונים, לוחץ חזק, אחרי 5 דק' "כואבת לי היד"
- התפרץ כשביקשתי לסיים את המגדל, זרק קוביות, נרגע אחרי 3 דק' על הכדור
- מוטיבציה גבוהה לדינוזאורים
- להמשיך: חיזוק כף יד, כתיבה על משטח משופע`,
      sections: [
        {
          heading: "מה עשינו במפגש",
          body: "במפגש היום עבדנו עם {{child}} על תכנון תנועה, גזירה וכתיבת השם. {{child}} הגיע עייף לאחר השכמה מוקדמת, ובכל זאת השתתף בכל הפעילויות.",
        },
        {
          heading: "מה מתקדם",
          body: "- במסלול המכשולים {{child}} טיפס בביטחון ובתנועה מתואמת\n- בגזירה בקו ישר הוא כבר מצליח באופן עצמאי\n- המוטיבציה שלו גבוהה במיוחד כשהפעילות קשורה לדינוזאורים, וזו נקודת חוזק שאנחנו משלבים בטיפול",
        },
        {
          heading: "מה עדיין מאתגר",
          body: "- בקפיצה על רגל אחת הוא מאבד את שיווי המשקל לאחר שלוש קפיצות\n- בגזירת עיגול הוא מסובב את הדף ביד הכותבת במקום ביד העוזרת, ולכן סוטה מהקו\n- בכתיבת השם האותיות בגדלים שונים והלחץ על העיפרון חזק. לאחר כחמש דקות של כתיבה הוא התלונן על כאב ביד\n\nבסיום בניית המגדל {{child}} התקשה להפסיק את הפעילות וזרק את הקוביות. הוא נרגע תוך כשלוש דקות בעזרת ישיבה על כדור גדול.",
        },
        {
          heading: "בבית השבוע",
          body: "- משחקים לחיזוק כף היד, כמו לישה של בצק או פלסטלינה, כחמש דקות ביום\n- הודעה מראש לפני סיום משחק (\"עוד שתי דקות מסיימים\")",
        },
      ],
    },
    {
      id: "he-initial-assessment",
      docType: "initial_assessment",
      notes: `הערכה ראשונית, בת 4 ו-9 ח', גן חובה
הפניה: גננת - קושי בישיבה במעגל, נמנעת מיצירה, מתפרצת במעברים
- הור': לידה במועד, התפתחות מוטורית תקינה, הליכה 13 ח'
- סותמת אוזניים בהפסקה בחצר, לא מסכימה לגרבי צמר
- במעגל קמה כל 2 דק', נשענת על הקיר
- מו"ג: מטפסת, רצה, נמנעת מנדנדה, עמידה על רגל אחת 3 שנ'
- מו"ע: אחיזת ארבע, גוזרת בקירוב, מעתיקה עיגול וקו, לא ריבוע
- נמנעת מצבעי ידיים, מנגבת מיד
- משחק סמלי עשיר, מנהלת את המשחק
- SP2 הורים: רגישות והימנעות "יותר מאחרים"
- להציע: טיפול שבועי, דיאטה חושית, אוזניות לגן, הדרכת צוות`,
      sections: [
        {
          heading: "סיבת הפנייה",
          body: "{{child}}, בת 4 ו-9 חודשים, לומדת בגן חובה. הופנתה להערכה בריפוי בעיסוק בעקבות פניית הגננת, בשל קושי בישיבה במעגל, הימנעות מפעילויות יצירה והתפרצויות בזמן מעברים.",
        },
        {
          heading: "רקע",
          body: "על פי דיווח ההורים, הלידה הייתה במועד וההתפתחות המוטורית תקינה (הליכה עצמאית בגיל 13 חודשים). ההורים מתארים רגישות לרעש ולבגדים מסוימים: {{child}} סותמת אוזניים בהפסקה בחצר ומסרבת ללבוש גרבי צמר.",
        },
        {
          heading: "כלי הערכה",
          body: "- תצפית קלינית במשחק ובמשימות מובנות\n- ראיון הורים\n- שאלון פרופיל חושי (SP2), גרסת הורים",
        },
        {
          heading: "ממצאים",
          body: "עיבוד חושי: בשאלון הפרופיל החושי שמילאו ההורים, ציוני הרגישות וההימנעות גבוהים מאלו של רוב הילדים בגילה. בתצפית נצפתה הימנעות ממגע בצבעי ידיים, ו{{child}} ניגבה את ידיה מיד לאחר המגע.\n\nמוטוריקה גסה: {{child}} מטפסת ורצה באופן מותאם לגיל. היא נמנעת מעלייה על נדנדה, ועמידה על רגל אחת נשמרת כשלוש שניות.\n\nמוטוריקה עדינה וגרפומוטוריקה: נצפתה אחיזת ארבע בעיפרון. היא גוזרת בקירוב לקו, מעתיקה עיגול וקו, ועדיין אינה מעתיקה ריבוע.\n\nמשחק: המשחק הסמלי עשיר, ו{{child}} נוטה להוביל את מהלך המשחק.",
        },
        {
          heading: "התרשמות כללית",
          body: "עולה כי {{child}} מגיבה בעוצמה רבה לגירויים שמיעתיים ומגעיים. ייתכן כי עומס חושי זה תורם לקושי שלה בישיבה במעגל ובמעברים בגן. לצד זאת בולטים אצלה משחק סמלי עשיר ויכולת הובלה, המהווים נקודות חוזק.",
        },
        {
          heading: "המלצות",
          body: "- טיפול בריפוי בעיסוק פעם בשבוע, עם דגש על ויסות חושי\n- בניית דיאטה חושית לבית ולגן\n- אוזניות להפחתת רעש בזמן ההפסקה בחצר\n- הדרכת הצוות החינוכי בגן",
        },
      ],
    },
  ],
};
