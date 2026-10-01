import { Plus, UserRound } from "lucide-react";
import Link from "next/link";
import { ChildrenFilters } from "@/components/children/ChildrenFilters";
import { StatusBadge } from "@/components/children/StatusBadge";
import { DeadlineBadge } from "@/components/forms/DeadlineBadge";
import { Avatar } from "@/components/ui/Avatar";
import { LinkButton } from "@/components/ui/Button";
import { getI18n } from "@/i18n/server";
import { listChildren, type StatusFilter } from "@/lib/children";
import { pendingForms, urgencyByChild } from "@/lib/forms/queries";
import { requireTherapist } from "@/lib/session";
import { localToday } from "@/lib/time";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: `${t.children.listTitle} · ${t.app.name}` };
}

function parseStatus(value: unknown): StatusFilter {
  return value === "archived" || value === "all" ? value : "active";
}

export default async function ChildrenPage(props: PageProps<"/children">) {
  const i18n = await getI18n();
  const { t } = i18n;
  const { accountId, account } = await requireTherapist();
  const urgencies = urgencyByChild(pendingForms(accountId, localToday(), account.deadlineWarnDays));
  const sp = await props.searchParams;
  const search = typeof sp.q === "string" ? sp.q : "";
  const status = parseStatus(sp.status);
  const rows = listChildren(accountId, { search, status });
  const isFiltered = search !== "" || status !== "active";
  const cols = t.children.columns;

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[28px] leading-tight font-semibold tracking-tight">{t.children.listTitle}</h1>
          <p className="mt-1 text-[13px] text-ink-muted">{t.children.listSubtitle}</p>
        </div>
        <LinkButton href="/children/new">
          <Plus className="size-4" />
          {t.children.addButton}
        </LinkButton>
      </header>

      <ChildrenFilters search={search} status={status} />

      <section className="overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
        {rows.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
            <span className="grid size-12 place-items-center rounded-full bg-tint text-tint-ink">
              <UserRound className="size-5" />
            </span>
            {isFiltered ? (
              <p className="text-ink-muted">{t.children.noResults}</p>
            ) : (
              <>
                <p className="text-[16px] font-semibold">{t.children.emptyTitle}</p>
                <p className="text-[13px] text-ink-muted">{t.children.emptyBody}</p>
                <LinkButton href="/children/new" className="mt-2">
                  <Plus className="size-4" />
                  {t.children.addButton}
                </LinkButton>
              </>
            )}
          </div>
        ) : (
          <>
            <div className="hidden grid-cols-[1.3fr_2fr_1fr_1fr_0.8fr] gap-4 border-b border-line bg-surface-muted px-5 py-3 text-[10.5px] font-medium tracking-[0.12em] text-ink-muted uppercase md:grid">
              <span>{cols.child}</span>
              <span>{cols.reason}</span>
              <span>{cols.school}</span>
              <span>{cols.since}</span>
              <span>{cols.status}</span>
            </div>
            <ul className="divide-y divide-line">
              {rows.map((child) => (
                <li key={child.id}>
                  <Link
                    href={`/children/${child.id}`}
                    className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 px-5 py-3.5 transition-colors hover:bg-surface-muted md:grid-cols-[1.3fr_2fr_1fr_1fr_0.8fr]"
                  >
                    <span className="flex items-center gap-3">
                      <Avatar name={child.name} />
                      <span>
                        <bdi className="block text-[14px] font-medium">{i18n.childName(child)}</bdi>
                        <span className="block text-[11.5px] text-ink-muted">{i18n.age(child.birthDate) ?? "—"}</span>
                      </span>
                    </span>
                    <span className="col-start-1 truncate ps-11 text-[13px] text-ink-soft md:col-start-auto md:ps-0">
                      {child.referralReason}
                    </span>
                    <span className="hidden text-[13px] text-ink-soft md:block">{child.schoolLevel ?? "—"}</span>
                    <span className="hidden text-[13px] text-ink-soft md:block">{i18n.date(child.followUpStart) || "—"}</span>
                    <span className="col-start-2 row-start-1 flex flex-wrap justify-end gap-1.5 md:col-start-auto md:row-start-auto md:justify-start">
                      <StatusBadge status={child.status} />
                      <DeadlineBadge urgency={urgencies.get(child.id)} />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
      {rows.length > 0 && <p className="text-[12px] text-ink-muted">{t.children.count(rows.length)}</p>}
    </div>
  );
}
