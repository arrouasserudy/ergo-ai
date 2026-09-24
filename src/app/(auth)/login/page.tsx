import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/LoginForm";
import { Card } from "@/components/ui/Card";
import { getI18n } from "@/i18n/server";
import { getSession } from "@/lib/session";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: `${t.auth.loginTitle} · ${t.app.name}` };
}

export default async function LoginPage() {
  const i18n = await getI18n();
  const { t } = i18n;
  if (await getSession()) redirect("/children");

  return (
    <Card className="p-6 sm:p-8">
      <h1 className="font-serif text-[26px] leading-tight font-medium">{t.auth.loginTitle}</h1>
      <p className="mt-1 mb-6 text-[13px] text-ink-muted">{t.auth.loginSubtitle}</p>
      <LoginForm />
    </Card>
  );
}
