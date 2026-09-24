import { redirect } from "next/navigation";
import { SignupForm } from "@/components/auth/SignupForm";
import { Card } from "@/components/ui/Card";
import { t } from "@/i18n/fr";
import { getSession } from "@/lib/session";

export const metadata = { title: `${t.auth.signupTitle} · ${t.app.name}` };

export default async function SignupPage() {
  if (await getSession()) redirect("/children");

  return (
    <Card className="p-6 sm:p-8">
      <h1 className="font-serif text-[26px] leading-tight font-medium">{t.auth.signupTitle}</h1>
      <p className="mt-1 mb-6 text-[13px] text-ink-muted">{t.auth.signupSubtitle}</p>
      <SignupForm />
    </Card>
  );
}
