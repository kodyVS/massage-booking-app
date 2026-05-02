"use client";

/**
 * Branded calendar primitive built on react-day-picker v9 - installed
 * alongside the rest of our UI primitives. We don't pull in shadcn's
 * default calendar template because it ships its own Button etc. that
 * collide with our existing `<Button>` and the brand-themed styling here
 * is small enough to inline.
 *
 * Key brand bindings:
 *   - selected day: coral background, cream text
 *   - today (un-selected): periwinkle ring
 *   - hover: coral/30 background
 *   - focus ring: periwinkle (matches global :focus-visible)
 *
 * Mobile-first: 44×44 day cells, pinch-friendly grid spacing.
 */
import { DayPicker, type DayPickerProps } from "react-day-picker";
import { cn } from "@/lib/cn";
import "react-day-picker/dist/style.css";

export type CalendarProps = DayPickerProps;

export function Calendar({
  className,
  classNames,
  showOutsideDays = false,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("rdp-vital", className)}
      classNames={{
        months: "flex flex-col sm:flex-row gap-4",
        month: "space-y-3",
        month_caption: "flex justify-center pt-1 relative items-center",
        caption_label: "font-display text-base text-coral-dark",
        nav: "flex items-center gap-1",
        button_previous: cn(
          "inline-flex h-8 w-8 items-center justify-center rounded-full",
          "text-coral-dark hover:bg-blush/60 transition",
          "absolute left-1 top-1",
        ),
        button_next: cn(
          "inline-flex h-8 w-8 items-center justify-center rounded-full",
          "text-coral-dark hover:bg-blush/60 transition",
          "absolute right-1 top-1",
        ),
        month_grid: "w-full border-collapse",
        weekdays: "flex",
        weekday: "w-11 text-[10px] uppercase tracking-wide text-ink/55",
        week: "flex w-full mt-1",
        day: "h-11 w-11 p-0 text-center align-middle",
        day_button: cn(
          "h-11 w-11 rounded-full text-sm font-medium text-ink",
          "transition focus-visible:outline focus-visible:outline-2",
          "focus-visible:outline-offset-2 focus-visible:outline-periwinkle",
          "hover:bg-coral/30 hover:text-coral-dark",
        ),
        selected: cn(
          "[&_button]:bg-periwinkle [&_button]:text-ink",
          "[&_button]:font-semibold [&_button:hover]:bg-periwinkle/90",
        ),
        today: "[&_button]:ring-1 [&_button]:ring-periwinkle/70",
        outside: "[&_button]:text-ink/30",
        disabled: "[&_button]:text-ink/25 [&_button]:cursor-not-allowed [&_button:hover]:bg-transparent",
        ...classNames,
      }}
      {...props}
    />
  );
}
