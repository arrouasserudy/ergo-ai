import { ClipboardList, Siren } from "lucide-react";
import { startEpisode } from "@/app/actions/episodes";
import { Button } from "@/components/ui/Button";
import { getI18n } from "@/i18n/server";

/** "Crise en cours" / "Noter une difficulté": plain forms, so they work before hydration. */
export async function StartButtons({ childId, size = "md" }: { childId: string; size?: "sm" | "md" }) {
  const { t } = await getI18n();
  return (
    <div className="flex flex-wrap gap-2">
      <form action={startEpisode.bind(null, childId, "crisis")}>
        <Button type="submit" size={size} className="bg-warn-ink hover:bg-warn-ink/90">
          <Siren className="size-4" />
          {t.episodes.startCrisis}
        </Button>
      </form>
      <form action={startEpisode.bind(null, childId, "difficulty")}>
        <Button type="submit" size={size} variant="secondary">
          <ClipboardList className="size-4" />
          {t.episodes.startDifficulty}
        </Button>
      </form>
    </div>
  );
}
