import clsx from "clsx";
import { badgeVariant } from "@/lib/calendar/badges";

// Full class names (Tailwind only sees literal strings): tokens `kid-1`…`kid-6` in globals.css.
const FILLED = [
  "bg-kid-1 text-kid-1-ink",
  "bg-kid-2 text-kid-2-ink",
  "bg-kid-3 text-kid-3-ink",
  "bg-kid-4 text-kid-4-ink",
  "bg-kid-5 text-kid-5-ink",
  "bg-kid-6 text-kid-6-ink",
];
const OUTLINE = ["border-kid-1-edge", "border-kid-2-edge", "border-kid-3-edge", "border-kid-4-edge", "border-kid-5-edge", "border-kid-6-edge"];

/**
 * A child's monogram in the calendar: initials of the displayed name (hidden mode
 * included) on a hue-less badge whose tone and shape are stable per child
 * (see lib/calendar/badges.ts). Decorative: the name is always given as text nearby.
 */
export function ChildBadge({ childId, initials, size = "sm" }: { childId: string; initials: string; size?: "xs" | "sm" | "md" }) {
  const { tone, shape } = badgeVariant(childId);
  return (
    <span
      aria-hidden
      dir="ltr"
      className={clsx(
        "inline-grid shrink-0 place-items-center leading-none font-semibold tracking-tight",
        size === "xs" && "size-[18px] text-[8.5px]",
        size === "sm" && "size-5 text-[9px]",
        size === "md" && "size-7 text-[11px]",
        // The surface ring keeps light tones apart from the tinted chip they sit on.
        shape === "filled" ? ["rounded-full ring-1 ring-surface", FILLED[tone]] : ["rounded-[4px] border-[1.5px] bg-surface text-ink", OUTLINE[tone]],
      )}
    >
      {initials || "?"}
    </span>
  );
}
