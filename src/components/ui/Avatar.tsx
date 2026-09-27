import clsx from "clsx";
import { initialsOf } from "@/lib/child-name";

/** "Léa Martin" → "LM", "L. M." → "LM". */
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
      {initialsOf(name).join("")}
    </span>
  );
}
