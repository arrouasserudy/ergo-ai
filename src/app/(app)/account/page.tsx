import { AccountNameForm } from "@/components/account/AccountNameForm";
import { AddTherapistForm } from "@/components/account/AddTherapistForm";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader } from "@/components/ui/Card";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { getI18n } from "@/i18n/server";
import { requireTherapist } from "@/lib/session";
import { listTherapists } from "@/lib/therapists";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: `${t.nav.account} · ${t.app.name}` };
}

const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");

export default async function AccountPage() {
  const i18n = await getI18n();
  const { t } = i18n;
  const { account, accountId, role, therapist } = await requireTherapist();
  const team = listTherapists(accountId);
  const isOwner = role === "owner";
  const cols = t.account.columns;

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <header>
        <Eyebrow>{t.account.eyebrow}</Eyebrow>
        <h1 className="mt-1 font-serif text-[32px] leading-tight font-medium">{t.account.title}</h1>
        <p className="mt-1 text-[13px] text-ink-muted">{t.account.subtitle}</p>
      </header>

      <Card>
        <CardHeader title={t.account.detailsTitle} hint={isOwner ? undefined : t.account.ownerOnly} />
        <div className="px-5 pb-5">
          {isOwner ? <AccountNameForm name={account.name} /> : <p className="text-[15px]">{account.name}</p>}
        </div>
      </Card>

      <Card>
        <CardHeader title={t.account.teamTitle} hint={t.account.teamHint(team.length)} />
        <div className="hidden grid-cols-[1.4fr_1.6fr_0.8fr_0.8fr] gap-4 border-y border-line bg-surface-muted px-5 py-2.5 text-[10.5px] font-medium tracking-[0.12em] text-ink-muted uppercase sm:grid">
          <span>{cols.name}</span>
          <span>{cols.email}</span>
          <span>{cols.role}</span>
          <span>{cols.since}</span>
        </div>
        <ul className="divide-y divide-line border-t border-line sm:border-t-0">
          {team.map((member) => (
            <li key={member.id} className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 px-5 py-3 sm:grid-cols-[1.4fr_1.6fr_0.8fr_0.8fr]">
              <span className="flex min-w-0 items-center gap-3">
                <Avatar initials={initialsOf(member.name)} />
                <span className="truncate text-[14px] font-medium">
                  {member.name}
                  {member.id === therapist.id && <span className="ms-1.5 text-[12px] font-normal text-ink-muted">({t.account.you})</span>}
                </span>
              </span>
              <span className="col-start-1 truncate ps-11 text-[13px] text-ink-soft sm:col-start-auto sm:ps-0">{member.email}</span>
              <span className="col-start-2 row-start-1 sm:col-start-auto sm:row-start-auto">
                <Badge tone={member.role === "owner" ? "tint" : "muted"}>{t.account.roles[member.role]}</Badge>
              </span>
              <span className="hidden text-[13px] text-ink-soft sm:block">{i18n.date(member.createdAt.toISOString())}</span>
            </li>
          ))}
        </ul>
      </Card>

      {isOwner && (
        <Card>
          <CardHeader title={t.account.addTitle} hint={t.account.addHint} />
          <div className="px-5 pb-5">
            <AddTherapistForm />
          </div>
        </Card>
      )}
    </div>
  );
}
