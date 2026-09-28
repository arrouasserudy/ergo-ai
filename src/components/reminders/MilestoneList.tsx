import clsx from "clsx";
import { CalendarPlus, PenLine } from "lucide-react";
import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { buttonClass } from "@/components/ui/Button";
import { getI18n } from "@/i18n/server";
import { MILESTONE_DOC_TYPE, needsAction, type MilestoneStatus } from "@/lib/reminders/milestones";

const TONE = { done: "ok", overdue: "warn", dueSoon: "tint", later: "muted" } as const;

type Row = { child: { id: string; name: string; birthDate: string | null }; status: MilestoneStatus };

/** Milestones with their state and the next step: write the report, or plan the guidance meeting. */
export async function MilestoneList({ rows, showChild }: { rows: Row[]; showChild: boolean }) {
  const i18n = await getI18n();
  const r = i18n.t.reminders;

  return (
    <ul className="divide-y divide-line border-t border-line">
      {rows.map(({ child, status }) => {
        const detail = [
          status.state === "overdue" ? r.overdueSince(i18n.date(status.dueDate)) : status.state !== "done" ? r.due(i18n.date(status.dueDate)) : null,
          status.draft ? r.draft : null,
          status.plannedOn ? r.plannedOn(i18n.date(status.plannedOn)) : null,
        ].filter(Boolean);
        const guidance = status.milestone === "parentGuidance";
        return (
          <li key={`${child.id}-${status.milestone}`} className="flex flex-wrap items-center gap-3 px-5 py-3">
            {showChild && <Avatar name={child.name} />}
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-2 text-[14px] font-medium">
                {showChild ? (
                  <Link href={`/children/${child.id}`} className="hover:underline">
                    <bdi>{i18n.childName(child)}</bdi>
                  </Link>
                ) : (
                  r.milestone[status.milestone]
                )}
                <Badge tone={TONE[status.state]}>{r.state[status.state]}</Badge>
              </p>
              <p className={clsx("text-[12.5px]", status.state === "overdue" ? "text-warn-ink" : "text-ink-muted")}>
                {showChild && <span className="text-ink-soft">{r.milestone[status.milestone]} · </span>}
                {detail.join(" · ")}
              </p>
            </div>
            {needsAction(status) && !status.plannedOn && (
              <Link
                href={guidance ? `/children/${child.id}?plan=parent_guidance#meetings` : `/reports/new?child=${child.id}&type=${MILESTONE_DOC_TYPE[status.milestone]}`}
                className={buttonClass("secondary", "sm")}
              >
                {guidance ? <CalendarPlus className="size-3.5" /> : <PenLine className="size-3.5" />}
                {guidance ? r.plan : r.write}
              </Link>
            )}
          </li>
        );
      })}
    </ul>
  );
}
