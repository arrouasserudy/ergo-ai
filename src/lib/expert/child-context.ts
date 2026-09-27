import type { Child, Episode } from "@/db/schema";
import { ageInMonths } from "@/i18n";
import { computePatterns, timeOfDay } from "@/lib/episode-insights";
import { replaceChildName } from "@/lib/reports/text";
import { minutesBetween } from "@/lib/time";

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

/** Swaps the child's name (full name or any word of it) for "the child" in free text. */
export function redactChildName(text: string, childName: string): string {
  return replaceChildName(text, childName, "the child");
}

function episodeFacts(episode: Episode, childName: string, timeZone: string, now: Date): string[] {
  const clean = (text: string) => redactChildName(text.trim(), childName);
  const facts: string[] = [];
  if (episode.situation) facts.push(`situation: ${clean(episode.situation)}`);
  facts.push(`time of day: ${timeOfDay(episode.startedAt, timeZone)}`);
  const end = episode.endedAt ?? (episode.status === "open" ? now : null);
  if (end) facts.push(`${episode.status === "open" ? "going on for" : "lasted"} ${minutesBetween(episode.startedAt, end)} min`);
  if (episode.causes.length) facts.push(`${episode.status === "open" ? "possible causes checked so far" : "causes"}: ${episode.causes.map(clean).join(", ")}`);
  if (episode.helped.length) facts.push(`${episode.status === "open" ? "tried so far" : "what helped"}: ${episode.helped.map(clean).join(", ")}`);
  if (episode.antecedent?.trim()) facts.push(`just before: "${clean(episode.antecedent)}"`);
  if (episode.behavior?.trim()) facts.push(`what the child did: "${clean(episode.behavior)}"`);
  if (episode.notes?.trim()) facts.push(`notes: "${clean(episode.notes)}"`);
  return facts;
}

/**
 * Context for asking help during an episode in progress: the child summary, the
 * current episode, and the child's past crises one by one, with the therapist's
 * free-text notes (the child's name swapped for "the child"; other names they
 * typed are sent as written).
 */
export function crisisContextText(child: Child, current: Episode, episodes: Episode[], timeZone: string, now = new Date()): string {
  const past = episodes.filter((e) => e.id !== current.id && e.kind === "crisis" && e.status === "closed").slice(0, 15);
  const days = (d: Date) => Math.floor((now.getTime() - d.getTime()) / 86_400_000);
  const lines = [
    childContextText(child, episodes, timeZone),
    "",
    `A ${current.kind === "crisis" ? "crisis" : "difficulty"} is happening right now: ${episodeFacts(current, child.name, timeZone, now).join("; ")}.`,
  ];
  if (past.length) {
    lines.push("", `Past crises (most recent first):`);
    for (const e of past) {
      const ago = days(e.startedAt);
      lines.push(`- ${ago === 0 ? "today" : `${ago} day${ago > 1 ? "s" : ""} ago`}: ${episodeFacts(e, child.name, timeZone, now).join("; ")}`);
    }
  } else {
    lines.push("", "No past crisis recorded for this child.");
  }
  return lines.join("\n");
}
