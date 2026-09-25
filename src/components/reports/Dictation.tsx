"use client";

import clsx from "clsx";
import { Loader2, Mic, Square } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { FormError } from "@/components/ui/FormError";
import type { Locale } from "@/i18n";
import { useI18n } from "@/i18n/client";

/** Beyond this, the recording stops on its own (and stays under the upload limit). */
const MAX_SECONDS = 10 * 60;
const BARS = 32;

/** Formats the browser can record, with the extension the transcription API expects. */
const FORMATS = [
  { mime: "audio/webm;codecs=opus", ext: "webm" },
  { mime: "audio/webm", ext: "webm" },
  { mime: "audio/mp4", ext: "mp4" },
  { mime: "audio/ogg;codecs=opus", ext: "ogg" },
];

type State = "idle" | "recording" | "transcribing";

/**
 * Records a dictation and sends it to the server for transcription. The text is
 * handed to `onText`; the audio is never stored, neither here nor on the server.
 */
export function Dictation({ language, available, onText }: { language: Locale; available: boolean; onText: (text: string) => void }) {
  const { t } = useI18n();
  const r = t.reports;
  const [state, setState] = useState<State>("idle");
  const [seconds, setSeconds] = useState(0);
  const [levels, setLevels] = useState<number[]>(() => Array(BARS).fill(0));
  const [error, setError] = useState<string | null>(null);
  const stopRef = useRef<(() => void) | null>(null);

  // Release the microphone if the page is left mid-recording.
  useEffect(() => () => stopRef.current?.(), []);

  const start = async () => {
    setError(null);
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setError(r.errors.micDenied);
      return;
    }
    const format = FORMATS.find((f) => MediaRecorder.isTypeSupported(f.mime)) ?? { mime: "", ext: "webm" };
    const recorder = new MediaRecorder(stream, format.mime ? { mimeType: format.mime } : undefined);
    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);

    // Level meter: one bar per ~120 ms, scrolling.
    const audio = new AudioContext();
    const analyser = audio.createAnalyser();
    analyser.fftSize = 512;
    audio.createMediaStreamSource(stream).connect(analyser);
    const samples = new Uint8Array(analyser.fftSize);
    const started = Date.now();
    const tick = setInterval(() => {
      analyser.getByteTimeDomainData(samples);
      const peak = samples.reduce((max, v) => Math.max(max, Math.abs(v - 128)), 0) / 128;
      setLevels((l) => [...l.slice(1), Math.min(1, peak * 2.5)]);
      const elapsed = Math.floor((Date.now() - started) / 1000);
      setSeconds(elapsed);
      if (elapsed >= MAX_SECONDS) stop();
    }, 120);

    function stop() {
      clearInterval(tick);
      stopRef.current = null;
      if (recorder.state !== "inactive") recorder.stop();
      stream.getTracks().forEach((track) => track.stop());
      void audio.close();
    }
    stopRef.current = stop;

    recorder.onstop = async () => {
      if (chunks.length === 0) {
        setState("idle");
        return;
      }
      setState("transcribing");
      const body = new FormData();
      body.append("audio", new File(chunks, `dictation.${format.ext}`, { type: recorder.mimeType || format.mime }));
      body.append("language", language);
      try {
        const res = await fetch("/api/reports/transcribe", { method: "POST", body });
        const json = (await res.json()) as { text?: string; error?: string };
        if (json.text) onText(json.text);
        else if (!res.ok) setError(r.errors[json.error ?? "dictationFailed"] ?? r.errors.dictationFailed);
      } catch {
        setError(r.errors.dictationFailed);
      }
      setState("idle");
    };

    recorder.start(1000);
    setSeconds(0);
    setLevels(Array(BARS).fill(0));
    setState("recording");
  };

  if (!available) return null;

  const time = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

  return (
    <div className="space-y-2">
      <div className={clsx("flex items-center gap-4 rounded-xl border px-4 py-3", state === "recording" ? "border-primary/25 bg-tint" : "border-line bg-surface-muted")}>
        {state === "recording" ? (
          <button
            type="button"
            onClick={() => stopRef.current?.()}
            aria-label={r.stop}
            className="grid size-11 shrink-0 place-items-center rounded-full bg-warn-ink text-white shadow-sm transition-transform hover:scale-105"
          >
            <Square className="size-4 fill-current" />
          </button>
        ) : (
          <button
            type="button"
            onClick={start}
            disabled={state === "transcribing"}
            aria-label={r.dictate}
            className="grid size-11 shrink-0 place-items-center rounded-full bg-warn-ink text-white shadow-sm transition-transform hover:scale-105 disabled:opacity-60"
          >
            {state === "transcribing" ? <Loader2 className="size-5 animate-spin" /> : <Mic className="size-5" />}
          </button>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-[13.5px] font-medium">
            {state === "recording" ? r.recording(time) : state === "transcribing" ? r.transcribing : r.dictate}
          </p>
          {state === "recording" ? (
            <div aria-hidden className="mt-1.5 flex h-5 items-center gap-[3px]" dir="ltr">
              {levels.map((level, i) => (
                <span key={i} className="w-[3px] rounded-full bg-primary" style={{ height: `${Math.max(12, level * 100)}%`, opacity: 0.35 + (i / BARS) * 0.65 }} />
              ))}
            </div>
          ) : (
            <p className="text-[12px] text-ink-muted">{r.dictationHint}</p>
          )}
        </div>
      </div>
      <FormError message={error ?? undefined} />
    </div>
  );
}
