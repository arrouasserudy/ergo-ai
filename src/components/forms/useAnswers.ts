"use client";

import { useEffect, useRef, useState } from "react";
import type { SaveState } from "@/components/ui/SaveIndicator";
import type { Answer, Answers } from "@/lib/forms/schema";

/** Answers being filled in, autosaved shortly after each change. */
export function useAnswers(initial: Answers, save: (answers: Answers) => Promise<{ ok: boolean }>) {
  const [answers, setAnswers] = useState<Answers>(initial);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const dirty = useRef(false);
  const saveRef = useRef(save);
  useEffect(() => {
    saveRef.current = save;
  });

  useEffect(() => {
    if (!dirty.current) return;
    const id = setTimeout(async () => {
      setSaveState("saving");
      try {
        const result = await saveRef.current(answers);
        setSaveState(result.ok ? "saved" : "error");
        if (result.ok) dirty.current = false;
      } catch {
        setSaveState("error");
      }
    }, 800);
    return () => clearTimeout(id);
  }, [answers]);

  const setAnswer = (fieldId: string, answer: Answer | undefined) => {
    dirty.current = true;
    setAnswers((prev) => {
      const next = { ...prev };
      if (answer === undefined) delete next[fieldId];
      else next[fieldId] = answer;
      return next;
    });
  };

  /** Stops a pending autosave (before a submit that saves anyway). */
  const flush = () => {
    dirty.current = false;
  };

  return { answers, setAnswer, saveState, flush };
}
