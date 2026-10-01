import { DeadlineSettingsForm } from "@/components/settings/DeadlineSettingsForm";
import { HideNamesToggle } from "@/components/settings/HideNamesToggle";
import { LocaleSwitcher } from "@/components/shell/LocaleSwitcher";
import { PasswordForm } from "@/components/settings/PasswordForm";
import { ProfileForm } from "@/components/settings/ProfileForm";
import { Card, CardHeader } from "@/components/ui/Card";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { getI18n } from "@/i18n/server";
import { requireTherapist } from "@/lib/session";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: `${t.nav.settings} · ${t.app.name}` };
}

export default async function SettingsPage() {
  const { t } = await getI18n();
  const { therapist, account } = await requireTherapist();

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <header>
        <Eyebrow>{t.settings.eyebrow}</Eyebrow>
        <h1 className="mt-1 text-[28px] leading-tight font-semibold tracking-tight">{t.settings.title}</h1>
        <p className="mt-1 text-[13px] text-ink-muted">{t.settings.subtitle}</p>
      </header>

      <Card>
        <CardHeader title={t.settings.profileTitle} />
        <div className="px-5 pb-5">
          <ProfileForm name={therapist.name} email={therapist.email} />
        </div>
      </Card>

      <Card>
        <CardHeader title={t.settings.passwordTitle} hint={t.settings.passwordHint} />
        <div className="px-5 pb-5">
          <PasswordForm />
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
  );
}
