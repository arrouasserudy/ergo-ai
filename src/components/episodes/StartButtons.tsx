import { ClipboardList, Siren } from "lucide-react";
import { startEpisode } from "@/app/actions/episodes";
import { Button } from "@/components/ui/Button";
import type { EpisodeKind } from "@/db/schema";
import { getI18n } from "@/i18n/server";

/** "Crise en cours" / "Noter une difficulté": plain forms, so they work before hydration. */
export async function StartButtons({
  childId,
  kinds = ["crisis", "difficulty"],
}: {
  childId: string;
  kinds?: EpisodeKind[];
}) {
  const { t } = await getI18n();
  return (
    <div className="flex flex-wrap gap-2">
      {kinds.includes("crisis") && (
        <form action={startEpisode.bind(null, childId, "crisis")}>
          <Button type="submit" className="bg-warn-ink hover:bg-warn-ink/90">
            <Siren className="size-4" />
            {t.episodes.startCrisis}
          </Button>
        </form>
      )}
      {kinds.includes("difficulty") && (
        <form action={startEpisode.bind(null, childId, "difficulty")}>
          <Button type="submit" variant="secondary">
            <ClipboardList className="size-4" />
            {t.episodes.startDifficulty}
          </Button>
        </form>
      )}
    </div>
  );
}
