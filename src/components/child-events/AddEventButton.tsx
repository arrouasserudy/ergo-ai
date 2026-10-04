"use client";

import { CalendarPlus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { useI18n } from "@/i18n/client";
import { EventDialog, type ReportOption } from "./EventDialog";

/** "Add event" on the child file's header: opens the event form in a modal. */
export function AddEventButton({
  childId,
  reports,
  today,
  size,
}: {
  childId: string;
  reports: ReportOption[];
  today: string;
  size?: "sm" | "md";
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="secondary" size={size} onClick={() => setOpen(true)}>
        <CalendarPlus className="size-4" />
        {t.childEvents.add}
      </Button>
      {open && <EventDialog childId={childId} reports={reports} defaultDate={today} onClose={() => setOpen(false)} />}
    </>
  );
}
