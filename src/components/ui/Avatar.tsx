import clsx from "clsx";

/** "Léa Martin" → "LM", "L. M." → "LM". */
const initialsOf = (name: string) =>
  name
    .split(/[\s.]+/)
    .map((w) => w.match(/\p{L}/u)?.[0]?.toUpperCase())
    .filter(Boolean)
    .slice(0, 2)
    .join("");

export function Avatar({ name, size = "md" }: { name: string; size?: "md" | "lg" }) {
  return (
    <span
      aria-hidden
      dir="ltr"
      className={clsx(
        "grid shrink-0 place-items-center rounded-full bg-tint font-medium text-tint-ink",
        size === "md" ? "size-8 text-[10.5px]" : "size-12 text-sm",
      )}
    >
      {initialsOf(name)}
    </span>
  );
}
