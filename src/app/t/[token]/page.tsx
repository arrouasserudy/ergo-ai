import { Lock } from "lucide-react";
import type { Metadata } from "next";
import { SharedAssessmentFill } from "@/components/assessments/SharedAssessmentFill";
import { PublicShell } from "@/components/forms/PublicShell";
import { Thanks } from "@/components/forms/SharedFormFill";
import { createI18n } from "@/i18n";
import { getI18n } from "@/i18n/server";
import { findSharedAssessment } from "@/lib/assessments/queries";
import { getDefinition } from "@/lib/assessments/registry";
import { APP_TIME_ZONE } from "@/lib/time";

// Public (see proxy.ts): the link's token is the only credential. Parents see the items
// only: never the scores, nor the child's name (in case the link is forwarded).

export const metadata: Metadata = { robots: { index: false, follow: false }, referrer: "no-referrer" };

export default async function SharedAssessmentPage(props: PageProps<"/t/[token]">) {
  const { token } = await props.params;
  const found = findSharedAssessment(token);
  const definition = found && getDefinition(found.assessment.definitionId);

  if (!found || !definition?.respondents.includes("parent")) {
    const { t, locale } = await getI18n();
    return (
      <PublicShell locale={locale} appName={t.app.name}>
        <div className="flex flex-col items-center gap-2 py-10 text-center">
          <p className="text-xl font-semibold tracking-tight">{t.forms.public.unavailableTitle}</p>
          <p className="max-w-md text-[14px] text-ink-muted">{t.forms.public.unavailableBody}</p>
        </div>
      </PublicShell>
    );
  }

  const { assessment, cabinet } = found;
  const locale = definition.language;
  const { t } = createI18n(locale, APP_TIME_ZONE);

  return (
    <PublicShell locale={locale} appName={t.app.name} wide>
      <header className="mb-6 space-y-2 border-b border-line pb-5">
        <p className="text-[12.5px] text-ink-muted">
          <bdi>{t.assessments.public.from(cabinet)}</bdi>
        </p>
        <h1 className="text-[24px] leading-tight font-semibold tracking-tight">{definition.name}</h1>
        {definition.instructions && <p className="text-[14px] whitespace-pre-line text-ink-soft">{definition.instructions}</p>}
        <p className="flex items-center gap-1.5 text-[12px] text-ok-ink">
          <Lock className="size-3.5" />
          {t.forms.public.privacy}
        </p>
      </header>
      {assessment.status === "completed" ? (
        <Thanks />
      ) : (
        <SharedAssessmentFill token={token} definitionId={definition.id} initial={assessment.answers} />
      )}
    </PublicShell>
  );
}
