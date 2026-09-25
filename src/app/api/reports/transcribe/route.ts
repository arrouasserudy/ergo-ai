import { isLocale } from "@/i18n";
import { MAX_AUDIO_BYTES, transcribe, transcriptionAvailable } from "@/lib/reports/transcribe";
import { getSession } from "@/lib/session";

/**
 * Dictation: receives the recorded audio and returns its text. The audio is held in
 * memory for the duration of the call only; nothing is written to disk or the database.
 */
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return Response.json({ error: "generic" }, { status: 401 });
  if (!transcriptionAvailable()) return Response.json({ error: "dictationUnavailable" }, { status: 503 });

  const form = await request.formData().catch(() => null);
  const audio = form?.get("audio");
  const language = form?.get("language");
  if (!(audio instanceof File) || audio.size === 0 || !isLocale(language)) return Response.json({ error: "generic" }, { status: 400 });
  if (audio.size > MAX_AUDIO_BYTES) return Response.json({ error: "dictationTooLong" }, { status: 413 });

  try {
    return Response.json({ text: await transcribe(audio, language) });
  } catch (err) {
    console.error("Transcription failed", err);
    return Response.json({ error: "dictationFailed" }, { status: 502 });
  }
}
