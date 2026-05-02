"use client";

import { useEffect, useRef, useState } from "react";
import { formatInTimeZone } from "date-fns-tz";
import { cn } from "@/lib/cn";
import { Calendar } from "@/components/ui/calendar";

interface Props {
  /** Number of days forward to render starting from today (in business TZ). */
  days?: number;
  /** YYYY-MM-DD currently selected. */
  selected: string | null;
  onSelect: (date: string) => void;
  tz: string;
  /**
   * When true, renders a "Pick a custom date" button next to the strip that
   * opens a calendar popover. Calendar reaches up to `customMaxDays` ahead
   * (default 365). Picked date updates the strip + lifts via `onSelect`.
   */
  enableCustomDate?: boolean;
  customMaxDays?: number;
}

/**
 * Horizontally-scrollable date strip optimized for thumb scrolling on mobile.
 * Each tile shows the abbreviated weekday and the day-of-month.
 *
 * Phase 6: range extended from 30 to 90 days; an optional "Pick a custom
 * date" button surfaces a periwinkle/coral calendar popover for dates up to
 * a year out. When the user picks a date that falls outside the visible
 * strip, the strip auto-scrolls so the chosen date is in view (or scrolls
 * to the end if the date is past the strip's range).
 */
export function DateStrip({
  days = 90,
  selected,
  onSelect,
  tz,
  enableCustomDate = false,
  customMaxDays = 365,
}: Props) {
  const now = new Date();
  const todayStr = formatInTimeZone(now, tz, "yyyy-MM-dd");
  const tiles = Array.from({ length: days }, (_, i) => {
    const d = new Date(now.getTime() + i * 86_400_000);
    const dateStr = formatInTimeZone(d, tz, "yyyy-MM-dd");
    return {
      date: dateStr,
      weekday: formatInTimeZone(d, tz, "EEE"),
      day: formatInTimeZone(d, tz, "d"),
      month: formatInTimeZone(d, tz, "MMM"),
    };
  });

  const [calendarOpen, setCalendarOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll the strip when `selected` changes so the chosen tile is
  // visible. Especially useful after the custom-date popover sets a date
  // far down the strip.
  useEffect(() => {
    if (!selected || !containerRef.current) return;
    const el = containerRef.current.querySelector<HTMLButtonElement>(
      `button[data-date="${selected}"]`,
    );
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    }
  }, [selected]);

  // Close the popover on outside click + Escape.
  useEffect(() => {
    if (!calendarOpen) return;
    function onDoc(e: MouseEvent) {
      if (
        popoverRef.current &&
        e.target instanceof Node &&
        !popoverRef.current.contains(e.target)
      ) {
        setCalendarOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setCalendarOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [calendarOpen]);

  // Calendar bounds: today through `customMaxDays` ahead, in the business TZ.
  const minDate = new Date(`${todayStr}T00:00:00`);
  const maxDateRaw = new Date(now.getTime() + customMaxDays * 86_400_000);
  const maxDate = new Date(
    `${formatInTimeZone(maxDateRaw, tz, "yyyy-MM-dd")}T23:59:59`,
  );

  // Convert react-day-picker's local Date → YYYY-MM-DD in the business TZ.
  function handlePick(d: Date | undefined) {
    if (!d) return;
    // Build a "wall clock" YYYY-MM-DD from the user's local pick, regardless
    // of TZ offset. The day-picker emits a Date at local midnight; format
    // via the y-m-d parts so we never accidentally cross a TZ boundary.
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    onSelect(`${yyyy}-${mm}-${dd}`);
    setCalendarOpen(false);
  }

  // Selected date → react-day-picker Date (local midnight) for highlighting.
  const selectedAsDate = selected
    ? new Date(`${selected}T00:00:00`)
    : undefined;

  return (
    <div className="space-y-3" ref={popoverRef}>
      <div
        ref={containerRef}
        role="radiogroup"
        aria-label="Choose a date"
        className="-mx-4 flex snap-x snap-mandatory gap-2 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0"
      >
        {tiles.map((t) => {
          const checked = selected === t.date;
          return (
            <button
              key={t.date}
              type="button"
              role="radio"
              aria-checked={checked}
              data-date={t.date}
              onClick={() => onSelect(t.date)}
              className={cn(
                "flex w-16 shrink-0 snap-start flex-col items-center gap-1 rounded-2xl bg-cream/90 px-2 py-3 text-center ring-1 ring-coral/15 transition",
                checked
                  ? "ring-2 ring-coral bg-coral text-cream"
                  : "hover:ring-coral/40",
              )}
            >
              <span
                className={cn(
                  "text-xs uppercase tracking-wide",
                  checked ? "text-cream/85" : "text-ink/60",
                )}
              >
                {t.weekday}
              </span>
              <span
                className={cn(
                  "font-display text-2xl leading-none",
                  checked ? "text-cream" : "text-coral-dark",
                )}
              >
                {t.day}
              </span>
              <span
                className={cn(
                  "text-[10px] uppercase",
                  checked ? "text-cream/85" : "text-ink/55",
                )}
              >
                {t.month}
              </span>
            </button>
          );
        })}
      </div>

      {enableCustomDate && (
        <div className="space-y-3">
          <button
            type="button"
            aria-expanded={calendarOpen}
            aria-controls="custom-date-popover"
            onClick={() => setCalendarOpen((v) => !v)}
            className={cn(
              "inline-flex items-center gap-2 rounded-full px-4 py-2 font-display text-sm",
              "bg-blush/40 text-coral-dark ring-1 ring-coral/20 transition",
              "hover:bg-blush/60 hover:ring-coral/40",
              calendarOpen && "bg-blush/60 ring-coral/40",
            )}
          >
            <span aria-hidden="true">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="3" />
                <path d="M16 2v4M8 2v4M3 10h18" />
              </svg>
            </span>
            <span>{calendarOpen ? "Hide calendar" : "Browse another month"}</span>
            <span aria-hidden="true" className={cn("transition-transform", calendarOpen && "rotate-180")}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </span>
          </button>
          {calendarOpen && (
            <div
              id="custom-date-popover"
              role="dialog"
              aria-label="Pick a custom date"
              className="rounded-2xl bg-cream/95 p-4 shadow-sm ring-1 ring-coral/15 sm:p-5"
            >
              <Calendar
                mode="single"
                selected={selectedAsDate}
                onSelect={handlePick}
                defaultMonth={selectedAsDate ?? minDate}
                disabled={{ before: minDate, after: maxDate }}
                startMonth={minDate}
                endMonth={maxDate}
              />
              <p className="mt-3 text-xs text-ink/55">
                Bookings open today through{" "}
                {formatInTimeZone(maxDate, tz, "MMM d, yyyy")}.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
