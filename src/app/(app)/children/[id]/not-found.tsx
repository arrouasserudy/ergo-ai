import { LinkButton } from "@/components/ui/Button";
import { getI18n } from "@/i18n/server";

export default async function ChildNotFound() {
  const i18n = await getI18n();
  const { t } = i18n;
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-20 text-center">
      <p className="font-serif text-xl">{t.children.notFound}</p>
      <LinkButton href="/children" variant="secondary">
        {t.children.backToList}
      </LinkButton>
    </div>
  );
}
