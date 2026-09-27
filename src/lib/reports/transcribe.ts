import "server-only";
import OpenAI from "openai";
import type { Locale } from "@/i18n";

export const TRANSCRIBE_MODEL = process.env.TRANSCRIBE_MODEL ?? "gpt-4o-transcribe";

/** OpenAI's upload limit for transcription. */
export const MAX_AUDIO_BYTES = 25 * 1024 * 1024;

/** Domain vocabulary helps the model spell clinical terms and test names. */
const VOCABULARY: Record<Locale, string> = {
  fr: "Notes de séance d'ergothérapie pédiatrique : motricité fine, graphomotricité, pince tripode, praxies, régulation sensorielle, proprioception, coussin lesté, bilan, M-ABC-2, BHK, Beery VMI, Profil sensoriel de Dunn.",
  he: "סיכום טיפול בריפוי בעיסוק לילדים: מוטוריקה עדינה, גרפומוטוריקה, אחיזת עיפרון, ויסות חושי, פרופריוספציה, כרית משקולת, אבחון, M-ABC-2, Beery VMI.",
  en: "Pediatric occupational therapy session notes: fine motor skills, handwriting, tripod grasp, praxis, sensory regulation, proprioception, weighted cushion, assessment, M-ABC-2, Beery VMI, Dunn Sensory Profile.",
};

export function transcriptionAvailable(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}

let client: OpenAI | null = null;

/** Transcribes a dictation. The audio is only held in memory for the call, never stored. */
export async function transcribe(audio: File, language: Locale): Promise<string> {
  client ??= new OpenAI();
  const result = await client.audio.transcriptions.create({
    model: TRANSCRIBE_MODEL,
    file: audio,
    language,
    prompt: VOCABULARY[language],
  });
  return result.text.trim();
}
