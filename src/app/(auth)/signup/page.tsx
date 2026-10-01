import { redirect } from "next/navigation";
import { SignupForm } from "@/components/auth/SignupForm";
import { Card } from "@/components/ui/Card";
import { getI18n } from "@/i18n/server";
import { getSession } from "@/lib/session";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: `${t.auth.signupTitle} · ${t.app.name}` };
}

export default async function SignupPage() {
  const i18n = await getI18n();
  const { t } = i18n;
  if (await getSession()) redirect("/");

  return (
    <Card className="p-6 sm:p-8">
      <h1 className="text-[24px] leading-tight font-semibold tracking-tight">{t.auth.signupTitle}</h1>
      <p className="mt-1 mb-6 text-[13px] text-ink-muted">{t.auth.signupSubtitle}</p>
      <SignupForm />
    </Card>
  );
}
