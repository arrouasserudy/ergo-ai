import clsx from "clsx";

/** Brand colors of the Otio logo and of Amit's portrait (fixed: they don't follow the UI tokens). */
export const BRAND = { teal: "#3a918c", tealDeep: "#2c7470", coral: "#e8836f", navy: "#1c3157", cream: "#faf7f0" } as const;

/** The Otio symbol: a teal ring, a navy dot and a coral smile. Decorative: pair it with the name or an aria-label. */
export function OtioMark({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true" className={clsx("block shrink-0", className)}>
      <circle cx="25.2" cy="32.1" r="17.9" fill="none" stroke={BRAND.teal} strokeWidth="7.2" />
      <circle cx="33.5" cy="32.6" r="3.8" fill={BRAND.navy} />
      <path d="M24.3 33.8a16.1 16.1 0 0 0 32.2 0" fill="none" stroke={BRAND.coral} strokeWidth="6.8" strokeLinecap="round" />
    </svg>
  );
}
