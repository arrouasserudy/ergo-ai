import clsx from "clsx";
import Image from "next/image";

/**
 * Amit, the expert colleague: a DiceBear "Adventurer" face (`public/amit.svg`) on the brand tint,
 * with a slow head tilt that stops under `prefers-reduced-motion`. The artwork is CC BY 4.0
 * (Lisa Wischofsky): its credit is on the /privacy page and must stay there while it is used.
 * Served as an image so every instance stays independent (the SVG has internal ids).
 * Decorative: the surrounding control carries the accessible label.
 */
export function AmitAvatar({ size = 24, className }: { size?: number; className?: string }) {
  return (
    <span aria-hidden="true" style={{ width: size, height: size }} className={clsx("inline-block shrink-0 overflow-hidden rounded-full bg-tint", className)}>
      <Image
        src="/amit.svg"
        alt=""
        width={size}
        height={size}
        draggable={false}
        className="block origin-[50%_85%] motion-safe:animate-amit-tilt"
      />
    </span>
  );
}
