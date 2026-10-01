/**
 * Telling children apart in the calendar (pure, tested).
 *
 * Color is reserved for the event type (crisis orange, difficulty indigo, report green…),
 * so a child is never a color: each event chip starts with a monogram badge (the initials
 * of the displayed name, which respects hidden mode). To make children scannable at a
 * glance, every child also gets a stable badge variant derived from its id:
 * 6 hue-less tones (slate = cool, stone = warm; light / mid / dark: tokens `kid-1`…`kid-6`)
 * × 2 styles (filled circle, outlined square) = 12 combinations. Two children may share a
 * variant; their initials (and the full name on hover, in lists and in the agenda) still
 * tell them apart. Derived from the id only, so a child keeps its badge across months,
 * filters and devices.
 */

export const BADGE_TONES = 6;
export type BadgeVariant = { tone: number; shape: "filled" | "outline" };

/** FNV-1a 32-bit: small, fast and stable across runtimes. */
function hash(value: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function badgeVariant(childId: string): BadgeVariant {
  const n = hash(childId) % (BADGE_TONES * 2);
  return { tone: n % BADGE_TONES, shape: n < BADGE_TONES ? "filled" : "outline" };
}
