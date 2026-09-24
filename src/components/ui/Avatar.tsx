import clsx from "clsx";

export function Avatar({ initials, size = "md" }: { initials: string; size?: "md" | "lg" }) {
  return (
    <span
      aria-hidden
      className={clsx(
        "grid shrink-0 place-items-center rounded-full bg-tint font-medium text-tint-ink",
        size === "md" ? "size-8 text-[10.5px]" : "size-12 text-sm",
      )}
    >
      {initials.replace(/\s/g, "")}
    </span>
  );
}
