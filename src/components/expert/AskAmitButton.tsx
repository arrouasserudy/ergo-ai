"use client";

import type { ReactNode } from "react";
import { openAmit } from "./amit-store";

/** Opens the Amit bubble about a child (and, when given, its episode in progress: help is asked right away). */
export function AskAmitButton({
  childId,
  episodeId = null,
  className,
  children,
}: {
  childId: string;
  episodeId?: string | null;
  className?: string;
  children: ReactNode;
}) {
  return (
    <button type="button" data-track={episodeId ? "amit.asked_from_episode" : "amit.asked_about_child"} onClick={() => openAmit({ kind: "new", childId, episodeId })} className={className}>
      {children}
    </button>
  );
}
