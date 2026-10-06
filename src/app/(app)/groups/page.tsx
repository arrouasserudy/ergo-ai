import clsx from "clsx";
import { ChevronRight, Shapes } from "lucide-react";
import Link from "next/link";
import { ChildrenTabs } from "@/components/children/ChildrenTabs";
import { GroupDot } from "@/components/groups/GroupBadge";
import { NEW_GROUP_PANEL, NewGroupPanel } from "@/components/groups/NewGroupPanel";
import { Avatar } from "@/components/ui/Avatar";
import { RevealButton, RevealProvider } from "@/components/ui/RevealPanel";
import type { GroupColor } from "@/db/schema";
import { getI18n } from "@/i18n/server";
import { totalsByGroup, type GroupTotals } from "@/lib/groups/overview";
import { childSummaries, listGroups } from "@/lib/groups/queries";
import { requireTherapist } from "@/lib/session";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: `${t.groups.title} · ${t.app.name}` };
}

const AVATARS = 6;

/** Every group of the cabinet as a card with its figures, plus the children without a group. */
export default async function GroupsPage() {
  const i18n = await getI18n();
  const { t } = i18n;
  const g = t.groups;
  const { account } = await requireTherapist();
  const groups = listGroups(account.id);
  const rows = childSummaries(account);
  const totals = totalsByGroup(
    rows.map((r) => r.child),
    new Map(rows.map((r) => [r.child.id, r.summary])),
    groups.map((group) => group.id),
  );
  const known = new Set(groups.map((group) => group.id));
  const membersOf = (id: string | null) => rows.filter((r) => (id === null ? r.child.groupId === null || !known.has(r.child.groupId) : r.child.groupId === id)).map((r) => r.child);
  const ungrouped = membersOf(null);

  return (
    <RevealProvider>
      <div className="mx-auto max-w-6xl space-y-5">
        <ChildrenTabs />
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-[28px] leading-tight font-semibold tracking-tight">{g.title}</h1>
            <p className="mt-1 max-w-2xl text-[13px] text-ink-muted">{g.subtitle}</p>
          </div>
          <RevealButton label={g.newButton} panelId={NEW_GROUP_PANEL} />
        </header>

        <NewGroupPanel />

        {groups.length === 0 ? (
          <section className="flex flex-col items-center gap-3 rounded-2xl border border-line bg-surface px-6 py-16 text-center shadow-card">
            <span className="grid size-12 place-items-center rounded-full bg-tint text-tint-ink">
              <Shapes className="size-5" />
            </span>
            <p className="text-[16px] font-semibold">{g.emptyTitle}</p>
            <p className="max-w-md text-[13px] text-ink-muted">{g.emptyBody}</p>
          </section>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {groups.map((group) => (
              <li key={group.id}>
                <GroupCard
                  href={`/groups/${group.id}`}
                  name={group.name}
                  place={group.place}
                  color={group.color}
                  totals={totals.get(group.id)!}
                  members={membersOf(group.id).map((c) => ({ id: c.id, name: c.name, label: i18n.childName(c) }))}
                />
              </li>
            ))}
            {ungrouped.length > 0 && (
              <li>
                <GroupCard
                  href="/children?group=none"
                  name={g.noGroup}
                  place={g.noGroupHint}
                  color={null}
                  totals={totals.get(null)!}
                  members={ungrouped.map((c) => ({ id: c.id, name: c.name, label: i18n.childName(c) }))}
                />
              </li>
            )}
          </ul>
        )}
      </div>
    </RevealProvider>
  );
}

async function GroupCard({
  href,
  name,
  place,
  color,
  totals,
  members,
}: {
  href: string;
  name: string;
  place: string | null;
  color: GroupColor | null;
  totals: GroupTotals;
  members: { id: string; name: string; label: string }[];
}) {
  const { t } = await getI18n();
  const g = t.groups;
  const figures = [
    { value: totals.crises, label: g.card.crises, tone: totals.crises > 0 ? "text-danger" : "" },
    { value: totals.formsOverdue, label: g.card.overdue, tone: totals.formsOverdue > 0 ? "text-danger" : "" },
    { value: totals.formsSoon, label: g.card.soon, tone: totals.formsSoon > 0 ? "text-warn-ink" : "" },
    { value: totals.drafts, label: g.card.drafts, tone: "" },
  ];
  return (
    <Link
      href={href}
      className={clsx(
        "group flex h-full flex-col rounded-2xl border bg-surface p-5 shadow-card transition-colors hover:border-line-strong",
        color ? "border-line" : "border-dashed border-line-strong",
      )}
    >
      <span className="flex items-start gap-3">
        {color ? <GroupDot color={color} className="mt-1.5 size-3" /> : <span className="mt-1.5 size-3 shrink-0 rounded-full border border-dashed border-ink-muted" />}
        <span className="min-w-0 flex-1">
          <bdi className="block truncate text-[16px] font-semibold tracking-tight">{name}</bdi>
          <span dir="auto" className="block truncate text-[12.5px] text-ink-muted">
            {place || " "}
          </span>
        </span>
        <ChevronRight className="mt-1 size-4 shrink-0 text-ink-muted transition-transform group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5" />
      </span>

      <span className="mt-4 flex items-center gap-2">
        <span className="flex -space-x-2 rtl:space-x-reverse">
          {members.slice(0, AVATARS).map((m) => (
            <span key={m.id} className="rounded-full ring-2 ring-surface" title={m.label}>
              <Avatar name={m.name} />
            </span>
          ))}
        </span>
        <span className="text-[12.5px] text-ink-soft">
          {members.length > AVATARS && `+${members.length - AVATARS} · `}
          {g.childrenCount(totals.children)}
        </span>
      </span>

      <span className="mt-4 grid grid-cols-4 gap-2 border-t border-line pt-3">
        {figures.map((f) => (
          <span key={f.label} className="min-w-0">
            <span className={clsx("block text-[20px] leading-none font-semibold tabular-nums", f.value === 0 ? "text-ink-muted/60" : f.tone || "text-ink")}>{f.value}</span>
            <span className="mt-1 block text-[11px] leading-tight text-ink-muted">{f.label}</span>
          </span>
        ))}
      </span>
    </Link>
  );
}
