import { CheckCircle2 } from "lucide-react";
import { eq } from "drizzle-orm";
import { AccountNameForm } from "@/components/account/AccountNameForm";
import { AddTherapistForm } from "@/components/account/AddTherapistForm";
import { LinkGoogleButton, GoogleLogo } from "@/components/auth/GoogleButton";
import { LetterheadForm } from "@/components/account/LetterheadForm";
import { DeadlineSettingsForm } from "@/components/settings/DeadlineSettingsForm";
import { HideNamesToggle } from "@/components/settings/HideNamesToggle";
import { LocaleSwitcher } from "@/components/shell/LocaleSwitcher";
import { PasswordForm } from "@/components/settings/PasswordForm";
import { ProfileForm } from "@/components/settings/ProfileForm";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader } from "@/components/ui/Card";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { FormError } from "@/components/ui/FormError";
import { db } from "@/db";
import { authCredentials } from "@/db/schema";
import { getI18n } from "@/i18n/server";
import { googleEnabled } from "@/lib/auth";
import { requireTherapist } from "@/lib/session";
import { listTherapists } from "@/lib/therapists";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: `${t.nav.settings} · ${t.app.name}` };
}

function GroupHeading({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="px-1 pt-3">
      <h2 className="text-[17px] leading-tight font-semibold tracking-tight">{title}</h2>
      <p className="mt-1 text-[12.5px] text-ink-muted">{hint}</p>
    </div>
  );
}

export default async function SettingsPage({ searchParams }: PageProps<"/settings">) {
  const i18n = await getI18n();
  const { t } = i18n;
  const { therapist, account, accountId, role } = await requireTherapist();
  const team = listTherapists(accountId);
  const isOwner = role === "owner";
  const cols = t.account.columns;

  // Sign-in methods: "credential" (password) and/or "google".
  const providers = new Set(
    db.select({ providerId: authCredentials.providerId }).from(authCredentials).where(eq(authCredentials.userId, therapist.id)).all().map((c) => c.providerId),
  );
  const hasGoogle = providers.has("google");
  // Back from linking Google: ?linked=google, or ?error=<code> (Better Auth's callback).
  const { linked, error } = await searchParams;
  const linkError = typeof error === "string" ? (t.settings.googleLinkErrors[error] ?? t.settings.googleLinkErrors.generic) : undefined;

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <header>
        <Eyebrow>{t.settings.eyebrow}</Eyebrow>
        <h1 className="mt-1 text-[28px] leading-tight font-semibold tracking-tight">{t.settings.title}</h1>
        <p className="mt-1 text-[13px] text-ink-muted">{t.settings.subtitle}</p>
      </header>

      {/* The practice (cabinet): shared by every therapist of the account; editing is owner-only. */}
      <div id="practice" className="scroll-mt-4 space-y-5">
        <GroupHeading title={t.account.title} hint={t.account.subtitle} />

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
                  <Avatar name={member.name} />
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

        <Card>
          <CardHeader title={t.account.letterheadTitle} hint={isOwner ? t.account.letterheadHint : t.account.ownerOnly} />
          <div className="px-5 pb-5">
            {isOwner ? (
              <LetterheadForm letterhead={account.letterhead} />
            ) : (
              <p dir="auto" className="text-[14px] whitespace-pre-line text-ink-soft">
                {account.letterhead ?? t.account.letterheadEmpty}
              </p>
            )}
          </div>
        </Card>

        <div id="deadlines" className="scroll-mt-4">
          <Card>
            <CardHeader title={t.settings.deadlinesTitle} hint={t.settings.deadlinesHint} />
            <div className="px-5 pb-5">
              <DeadlineSettingsForm warnDays={account.deadlineWarnDays} schoolYearStart={account.schoolYearStart} />
            </div>
          </Card>
        </div>
      </div>

      {/* Personal: this therapist's profile and per-device preferences. */}
      <div id="me" className="scroll-mt-4 space-y-5">
        <GroupHeading title={t.settings.personalTitle} hint={t.settings.personalSubtitle} />

        <Card>
          <CardHeader title={t.settings.profileTitle} />
          <div className="px-5 pb-5">
            <ProfileForm name={therapist.name} email={therapist.email} />
          </div>
        </Card>

        {(googleEnabled || hasGoogle) && (
          <Card>
            <CardHeader title={t.settings.signInTitle} hint={t.settings.signInHint} />
            <div className="space-y-4 px-5 pb-5">
              <FormError message={linkError} />
              {hasGoogle ? (
                <p role="status" className="flex items-center gap-2 text-[14px]">
                  <GoogleLogo className="size-[18px]" />
                  {linked === "google" ? t.settings.googleLinkedNow : t.settings.googleLinked}
                  <CheckCircle2 className="size-4 text-ok-ink" />
                </p>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-[13px] text-ink-muted">{t.settings.googleNotLinked}</p>
                  <LinkGoogleButton />
                </div>
              )}
            </div>
          </Card>
        )}

        <Card>
          <CardHeader title={t.settings.passwordTitle} hint={providers.has("credential") ? t.settings.passwordHint : undefined} />
          <div className="px-5 pb-5">
            {providers.has("credential") ? <PasswordForm /> : <p className="text-[13px] text-ink-muted">{t.settings.googleOnly}</p>}
          </div>
        </Card>

        <Card>
          <CardHeader title={t.settings.hideNamesTitle} hint={t.settings.hideNamesHint} />
          <div className="px-5 pb-5">
            <HideNamesToggle />
          </div>
        </Card>

        <Card>
          <CardHeader title={t.settings.languageTitle} hint={t.settings.languageHint} />
          <div className="px-5 pb-5">
            <LocaleSwitcher />
          </div>
        </Card>
      </div>
    </div>
  );
}
