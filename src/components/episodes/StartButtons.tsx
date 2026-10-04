import { ClipboardList, Siren } from "lucide-react";
import { startEpisode } from "@/app/actions/episodes";
import { Button } from "@/components/ui/Button";
import type { EpisodeKind } from "@/db/schema";
import { getI18n } from "@/i18n/server";

/**
 * "Crise en cours" / "Noter une difficulté": plain forms, so they work before hydration.
 * `compact` turns the crisis button into a small round alert icon (child header).
 */
export async function StartButtons({
  childId,
  kinds = ["crisis", "difficulty"],
  compact = false,
}: {
  childId: string;
  kinds?: EpisodeKind[];
  compact?: boolean;
}) {
  const { t } = await getI18n();
  return (
    <div className="flex flex-wrap gap-2">
      {kinds.includes("crisis") && (
        <form action={startEpisode.bind(null, childId, "crisis")}>
          {compact ? (
            <button
              type="submit"
              title={t.episodes.startCrisis}
              aria-label={t.episodes.startCrisis}
              className="inline-flex size-9 items-center justify-center rounded-full bg-warn-ink text-primary-ink shadow-[0_1px_2px_rgb(20_48_40/0.12)] transition-colors hover:bg-warn-ink/90"
            >
              <Siren className="size-4.5" />
            </button>
          ) : (
            <Button type="submit" className="bg-warn-ink hover:bg-warn-ink/90">
              <Siren className="size-4" />
              {t.episodes.startCrisis}
            </Button>
          )}
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
