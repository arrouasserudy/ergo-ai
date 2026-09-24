import { LinkButton } from "@/components/ui/Button";
import { t } from "@/i18n/fr";

export default function ChildNotFound() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-20 text-center">
      <p className="font-serif text-xl">{t.children.notFound}</p>
      <LinkButton href="/children" variant="secondary">
        {t.children.backToList}
      </LinkButton>
    </div>
  );
}
