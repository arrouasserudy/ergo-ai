"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import type { MeetingKind } from "@/db/schema";
import { useI18n } from "@/i18n/client";
import type { MeetingView } from "@/lib/meetings/view";
import { MeetingForm } from "./MeetingForm";
import { MeetingRow } from "./MeetingRow";

/** The child page's meetings: upcoming first, then past ones, and the form to add one. */
export function MeetingsPanel({ childId, views, smsAuto, canAdd, openWith }: { childId: string; views: MeetingView[]; smsAuto: boolean; canAdd: boolean; openWith?: MeetingKind }) {
  const { t } = useI18n();
  const m = t.meetings;
  const [adding, setAdding] = useState(Boolean(openWith));
  const upcoming = views.filter((v) => v.upcoming).reverse();
  const past = views.filter((v) => !upcoming.includes(v)).slice(0, 5);

  return (
    <div>
      {canAdd && (
        <div className="px-5 pb-4">
          {adding ? (
            <MeetingForm childId={childId} defaultKind={openWith} onDone={() => setAdding(false)} />
          ) : (
            <Button variant="secondary" size="sm" onClick={() => setAdding(true)}>
              <Plus className="size-3.5" />
              {m.add}
            </Button>
          )}
        </div>
      )}
      {views.length === 0 ? (
        <p className="px-5 pb-5 text-[13px] text-ink-muted">{m.none}</p>
      ) : (
        <>
          {upcoming.length > 0 && (
            <>
              <p className="border-t border-line bg-surface-muted px-5 py-2 text-[11.5px] font-medium text-ink-muted">{m.upcoming}</p>
              <ul className="divide-y divide-line border-t border-line">
                {upcoming.map((v) => (
                  <li key={v.meeting.id}>
                    <MeetingRow view={v} smsAuto={smsAuto} />
                  </li>
                ))}
              </ul>
            </>
          )}
          {past.length > 0 && (
            <>
              <p className="border-t border-line bg-surface-muted px-5 py-2 text-[11.5px] font-medium text-ink-muted">{m.past}</p>
              <ul className="divide-y divide-line border-t border-line">
                {past.map((v) => (
                  <li key={v.meeting.id}>
                    <MeetingRow view={v} smsAuto={smsAuto} />
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      )}
    </div>
  );
}
