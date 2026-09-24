import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/LoginForm";
import { Card } from "@/components/ui/Card";
import { t } from "@/i18n/fr";
import { getSession } from "@/lib/session";

export const metadata = { title: `${t.auth.loginTitle} · ${t.app.name}` };

export default async function LoginPage() {
  if (await getSession()) redirect("/children");

  return (
    <Card className="p-6 sm:p-8">
      <h1 className="font-serif text-[26px] leading-tight font-medium">{t.auth.loginTitle}</h1>
      <p className="mt-1 mb-6 text-[13px] text-ink-muted">{t.auth.loginSubtitle}</p>
      <LoginForm />
    </Card>
  );
}
