"use client";

import { forwardRef, type SelectHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export const Select = forwardRef<
  HTMLSelectElement,
  SelectHTMLAttributes<HTMLSelectElement>
>(function Select({ className, children, ...rest }, ref) {
  return (
    <select
      ref={ref}
      className={cn(
        "w-full rounded-xl border border-coral/20 bg-cream px-3 py-2 text-sm text-ink focus-visible:outline-2 focus-visible:outline-periwinkle disabled:cursor-not-allowed disabled:bg-blush/30 disabled:text-ink/60",
        className,
      )}
      {...rest}
    >
      {children}
    </select>
  );
});
