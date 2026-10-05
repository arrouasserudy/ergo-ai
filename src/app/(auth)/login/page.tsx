import { redirect } from "next/navigation";
import { GoogleSignIn } from "@/components/auth/GoogleButton";
import { LoginForm } from "@/components/auth/LoginForm";
import { FormError } from "@/components/ui/FormError";
import { Card } from "@/components/ui/Card";
import { getI18n } from "@/i18n/server";
import { googleEnabled } from "@/lib/auth";
import { getSession } from "@/lib/session";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: `${t.auth.loginTitle} · ${t.app.name}` };
}

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const i18n = await getI18n();
  const { t } = i18n;
  if (await getSession()) redirect("/");
  // A failed Google sign-in comes back here as ?error=<code> (Better Auth's callback).
  const { error } = await searchParams;
  const googleError = typeof error === "string" ? (t.auth.googleErrors[error] ?? t.auth.googleErrors.generic) : undefined;

  return (
    <Card className="p-6 sm:p-8">
      <h1 className="text-[24px] leading-tight font-semibold tracking-tight">{t.auth.loginTitle}</h1>
      <p className="mt-1 mb-6 text-[13px] text-ink-muted">{t.auth.loginSubtitle}</p>
      {googleError && (
        <div className="mb-5">
          <FormError message={googleError} />
        </div>
      )}
      {googleEnabled && <GoogleSignIn />}
      <LoginForm />
    </Card>
  );
}
