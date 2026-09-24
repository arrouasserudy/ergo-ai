import type { Child, Episode } from "@/db/schema";
import { ageInMonths } from "@/i18n";
import { computePatterns } from "@/lib/episode-insights";

/**
 * Pseudonymized summary of a child for the expert chat. Structured fields and the
 * therapist's own profile notes only: no initials, no name, no free-text crisis notes
 * (they could mention people). Shown verbatim to the therapist before it is sent.
 */
export function childContextText(child: Child, episodes: Episode[], timeZone: string): string {
  const lines: string[] = ["Context about the child we are discussing (pseudonymized):"];
  if (child.birthDate) {
    const months = ageInMonths(child.birthDate);
    lines.push(`- Age: ${months < 24 ? `${months} months` : `${Math.floor(months / 12)} years`}`);
  }
  lines.push(`- Reason for referral: ${child.referralReason}`);
  if (child.schoolLevel) lines.push(`- School level: ${child.schoolLevel}`);
  const list = (label: string, values: string[]) => values.length && lines.push(`- ${label}: ${values.join(", ")}`);
  list("Sensory hypersensitivities", child.hyperSensitivities);
  list("Sensory hyporeactivity", child.hypoReactivities);
  if (child.seeksDeepPressure) lines.push("- Seeks deep pressure / proprioceptive input");
  list("Usual background factors", child.backgroundFactors);
  if (child.knownTriggers) lines.push(`- Known triggers (from the parent interview): ${child.knownTriggers}`);
  if (child.warningSigns) lines.push(`- Warning signs: ${child.warningSigns}`);
  list("What usually calms them", child.calmingStrategies);
  list("Interests", child.interests);

  const crises = episodes.filter((e) => e.kind === "crisis" && e.status === "closed").slice(0, 10);
  if (crises.length) {
    const p = computePatterns(crises, timeZone);
    const parts = [
      p.trigger && `most frequent trigger "${p.trigger.key}" (${p.trigger.count}/${p.total})`,
      p.background && `background factor "${p.background.key}" (${p.background.count}/${p.total})`,
      p.timeOfDay && `mostly ${p.timeOfDay.bucket} (${p.timeOfDay.count}/${p.total})`,
      p.helped && `what helped most "${p.helped.key}" (${p.helped.count}/${p.total})`,
    ].filter(Boolean);
    lines.push(`- Last ${crises.length} recorded crises${parts.length ? `: ${parts.join("; ")}` : ""}`);
  }
  return lines.join("\n");
}
