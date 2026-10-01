import clsx from "clsx";
import Link from "next/link";
import type { ComponentProps } from "react";

type Variant = "primary" | "secondary" | "ghost";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-primary text-primary-ink hover:bg-primary-hover shadow-[0_1px_2px_rgb(20_48_40/0.12),inset_0_1px_0_rgb(255_255_255/0.12)]",
  secondary: "border border-line-strong bg-surface text-ink shadow-[0_1px_2px_rgb(20_48_40/0.05)] hover:bg-surface-muted",
  ghost: "text-ink-soft hover:bg-surface-muted hover:text-ink",
};

export function buttonClass(variant: Variant = "primary", size: "sm" | "md" = "md") {
  return clsx(
    "inline-flex items-center justify-center gap-1.5 rounded-full font-medium whitespace-nowrap transition-colors disabled:cursor-not-allowed disabled:opacity-60",
    // Touch-sized: 44px is the minimum comfortable target on a tablet.
    size === "md" ? "h-11 px-5 text-[14px]" : "h-9 px-3.5 text-[13px]",
    VARIANTS[variant],
  );
}

type ButtonProps = ComponentProps<"button"> & { variant?: Variant; size?: "sm" | "md" };

export function Button({ variant, size, className, type = "button", ...props }: ButtonProps) {
  return <button type={type} className={clsx(buttonClass(variant, size), className)} {...props} />;
}

type LinkButtonProps = ComponentProps<typeof Link> & { variant?: Variant; size?: "sm" | "md" };

export function LinkButton({ variant, size, className, ...props }: LinkButtonProps) {
  return <Link className={clsx(buttonClass(variant, size), className)} {...props} />;
}
