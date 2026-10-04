import clsx from "clsx";
import { BRAND } from "@/components/brand/OtioMark";

/**
 * Amit, the expert colleague: a round cream face held in a teal and coral circle, with a little
 * "idea" spark on the forehead. Decorative: the surrounding control carries the accessible label.
 */
export function AmitAvatar({ size = 24, className }: { size?: number; className?: string }) {
  return (
    <span aria-hidden="true" style={{ width: size, height: size }} className={clsx("inline-block shrink-0 overflow-hidden rounded-full", className)}>
      <svg viewBox="0 0 48 48" width={size} height={size} className="block">
        <circle cx="24" cy="24" r="24" fill={BRAND.teal} />
        {/* The coral "arms" holding the face, rounded where they meet the teal */}
        <path d="M0 24a3.25 3.25 0 0 1 6.5 0h35a3.25 3.25 0 0 1 6.5 0 24 24 0 0 1-48 0z" fill={BRAND.coral} />
        <circle cx="25" cy="25.2" r="17.5" fill="#000" opacity=".12" />
        <circle cx="24" cy="23.7" r="17.5" fill={BRAND.cream} />
        {/* Idea spark */}
        <g stroke={BRAND.navy} strokeWidth="2" strokeLinecap="round">
          <path d="M24 7.4v2" />
          <path d="M19.4 9.5l1.3 1.3" />
          <path d="M28.6 9.5l-1.3 1.3" />
        </g>
        <circle cx="24" cy="13.6" r="2.5" fill={BRAND.navy} />
        {/* Eyes and smile */}
        <circle cx="15.8" cy="22.9" r="3" fill={BRAND.navy} />
        <circle cx="32.2" cy="22.9" r="3" fill={BRAND.navy} />
        <path d="M18.7 30.2q5.3 4.4 10.6 0" fill="none" stroke={BRAND.coral} strokeWidth="1.9" strokeLinecap="round" />
      </svg>
    </span>
  );
}
