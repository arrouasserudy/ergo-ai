"use client";

import { useEffect, useRef, useState } from "react";
import type { SaveState } from "@/components/ui/SaveIndicator";
import type { AssessmentAnswers } from "@/lib/assessments/types";

/** Answers being entered, autosaved shortly after each change. */
export function useAssessmentAnswers(initial: AssessmentAnswers, save: (answers: AssessmentAnswers) => Promise<{ ok: boolean }>) {
  const [answers, setAnswers] = useState<AssessmentAnswers>(initial);
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

  const update = (change: (prev: AssessmentAnswers) => AssessmentAnswers) => {
    dirty.current = true;
    setAnswers(change);
  };

  /** Stops a pending autosave (before a submit that saves anyway). */
  const flush = () => {
    dirty.current = false;
  };

  return { answers, update, saveState, flush };
}
