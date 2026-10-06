import clsx from "clsx";
import Image from "next/image";

/**
 * Amit, the expert colleague: a little teal clay creature with coral antennae (DiceBear "Clay",
 * CC0, generated in the brand colors; `public/amit.svg`). The SVG carries its own gentle
 * squash-and-peek animation, which stops under `prefers-reduced-motion`. Served as an image so
 * every instance stays independent (the SVG has internal ids). Decorative: the surrounding
 * control carries the accessible label.
 */
export function AmitAvatar({ size = 24, className }: { size?: number; className?: string }) {
  return (
    <span aria-hidden="true" style={{ width: size, height: size }} className={clsx("inline-block shrink-0 overflow-hidden rounded-full", className)}>
      <Image src="/amit.svg" alt="" width={size} height={size} className="block" draggable={false} />
    </span>
  );
}
