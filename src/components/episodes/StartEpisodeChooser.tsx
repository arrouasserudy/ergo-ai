"use client";

import clsx from "clsx";
import { ClipboardList, Siren } from "lucide-react";
import Link from "next/link";
import { useState, type ComponentProps } from "react";
import { useFormStatus } from "react-dom";
import { startEpisode } from "@/app/actions/episodes";
import { Button, buttonClass } from "@/components/ui/Button";
import type { EpisodeKind } from "@/db/schema";
import { useI18n } from "@/i18n/client";

const control =
  "h-11 min-w-0 rounded-xl border border-line-strong bg-surface px-3 text-[14px] focus:border-primary focus:ring-2 focus:ring-primary/15 focus:outline-none";

/** Pick a child, then start a crisis or a difficulty for them (same action as the child page's buttons). */
export function StartEpisodeChooser({ childOptions }: { childOptions: { id: string; label: string }[] }) {
  const { t } = useI18n();
  const e = t.episodes;
  const [childId, setChildId] = useState("");

  if (childOptions.length === 0) {
    return (
      <div>
        <p className="mb-3 text-[13px] text-ink-muted">{e.noChildren}</p>
        <Link href="/children/new" className={buttonClass("secondary")}>
          {t.children.addButton}
        </Link>
      </div>
    );
  }

  const start = (kind: EpisodeKind) => () => startEpisode(childId, kind);
  return (
    <form className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
      <select
        value={childId}
        onChange={(event) => setChildId(event.target.value)}
        required
        autoFocus
        aria-label={e.pickChild}
        dir="auto"
        className={`${control} sm:w-64`}
      >
        <option value="" disabled>
          {e.pickChildPlaceholder}
        </option>
        {childOptions.map((c) => (
          <option key={c.id} value={c.id}>
            {c.label}
          </option>
        ))}
      </select>
      <div className="flex flex-wrap gap-2">
        <Submit formAction={start("crisis")} disabled={!childId} className="bg-warn-ink hover:bg-warn-ink/90">
          <Siren className="size-4" />
          {e.startCrisis}
        </Submit>
        <Submit formAction={start("difficulty")} disabled={!childId} variant="secondary">
          <ClipboardList className="size-4" />
          {e.startDifficulty}
        </Submit>
      </div>
    </form>
  );
}

function Submit({ disabled, className, ...props }: ComponentProps<typeof Button>) {
  const { pending } = useFormStatus();
  return <Button type="submit" disabled={disabled || pending} className={clsx("flex-1 sm:flex-none", className)} {...props} />;
}
