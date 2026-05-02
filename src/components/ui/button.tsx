"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const VARIANT: Record<Variant, string> = {
  primary:
    "bg-coral text-cream hover:bg-coral-dark focus-visible:bg-coral-dark disabled:bg-blush/60 disabled:text-ink/50",
  secondary:
    "bg-cream text-coral-dark ring-1 ring-coral/30 hover:ring-coral/60 disabled:opacity-60",
  ghost:
    "bg-transparent text-ink/80 hover:bg-blush/40 disabled:opacity-60",
  danger:
    "bg-coral-dark text-cream hover:bg-coral-dark/90 disabled:opacity-60",
};

const SIZE: Record<Size, string> = {
  sm: "px-3 py-1.5 text-xs rounded-lg",
  md: "px-4 py-2 text-sm rounded-xl",
  lg: "px-6 py-3 text-base rounded-2xl",
};

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { className, variant = "primary", size = "md", type = "button", ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 font-semibold transition disabled:cursor-not-allowed",
        VARIANT[variant],
        SIZE[size],
        className,
      )}
      {...rest}
    />
  );
});
