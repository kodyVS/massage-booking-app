"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { formatInTimeZone } from "date-fns-tz";
import type { ServiceDTO, ServiceSlotDTO, TherapistDTO } from "@/backend";
import { cn } from "@/lib/cn";
import { DateStrip } from "./date-strip";

interface Props {
  service: ServiceDTO;
  /** Therapists who offer this service. Used to render names per slot. */
  therapists: TherapistDTO[];
  tz: string;
}

interface AvailabilityResult {
  key: string;
  slots: ServiceSlotDTO[];
  error: string | null;
}

/**
 * Service-first booking picker.
 *
 *   1. Date picker (90-day strip + custom-date popover up to 1 year)
 *   2. Time-slot list - each slot shows the therapists who are available
 *   3. After picking a slot, the user picks one of those therapists
 *   4. Continue → /book/confirm with therapist + service + slot
 *
 * Powered by `GET /api/availability?mode=by-service&serviceId=…&date=…`.
 */
export function ServiceBookingPicker({ service, therapists, tz }: Props) {
  const router = useRouter();
  const therapistMap = useMemo(
    () => new Map(therapists.map((t) => [t.id, t])),
    [therapists],
  );

  const todayStr = useMemo(
    () => formatInTimeZone(new Date(), tz, "yyyy-MM-dd"),
    [tz],
  );
  const [date, setDate] = useState<string>(todayStr);
  const [result, setResult] = useState<AvailabilityResult | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [selectedTherapist, setSelectedTherapist] = useState<string | null>(null);
  const therapistSectionRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (selectedSlot && therapistSectionRef.current) {
      therapistSectionRef.current.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }, [selectedSlot]);

  // Derive loading from a request-key comparison so we never flip state
  // synchronously inside an effect.
  const requestKey = `${service.id}|${date}`;
  const loading = result?.key !== requestKey;
  const slots = result?.key === requestKey ? result.slots : [];
  const error = result?.key === requestKey ? result.error : null;

  useEffect(() => {
    let cancelled = false;
    const url = `/api/availability?mode=by-service&serviceId=${service.id}&date=${date}`;
    fetch(url, { headers: { Accept: "application/json" } })
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (data.ok) {
          setResult({
            key: requestKey,
            slots: data.data as ServiceSlotDTO[],
            error: null,
          });
        } else {
          setResult({
            key: requestKey,
            slots: [],
            error: data.error?.message ?? "Could not load availability.",
          });
        }
        setSelectedSlot(null);
        setSelectedTherapist(null);
      })
      .catch(() => {
        if (cancelled) return;
        setResult({
          key: requestKey,
          slots: [],
          error: "Could not load availability. Please retry.",
        });
        setSelectedSlot(null);
        setSelectedTherapist(null);
      });
    return () => {
      cancelled = true;
    };
  }, [requestKey, service.id, date]);

  const slotsForChosen = selectedSlot
    ? slots.find((s) => s.startAt === selectedSlot)
    : null;
  const availableTherapistsForSlot = slotsForChosen
    ? slotsForChosen.therapistIds
        .map((id) => therapistMap.get(id))
        .filter((t): t is TherapistDTO => Boolean(t))
    : [];

  function handleContinue() {
    if (!selectedSlot || !selectedTherapist) return;
    const params = new URLSearchParams({
      therapistId: selectedTherapist,
      serviceId: service.id,
      startAt: selectedSlot,
    });
    router.push(`/book/confirm?${params.toString()}`);
  }

  return (
    <div className="space-y-8">
      {/* Date */}
      <section aria-labelledby="step-date" className="space-y-3">
        <h2 id="step-date" className="font-display text-xl text-coral-dark">
          1. Pick a date
        </h2>
        <DateStrip
          days={90}
          selected={date}
          onSelect={setDate}
          tz={tz}
          enableCustomDate
          customMaxDays={365}
        />
      </section>

      {/* Slots */}
      <section aria-labelledby="step-slot" className="space-y-3">
        <h2 id="step-slot" className="font-display text-xl text-coral-dark">
          2. Pick a time
        </h2>
        {loading ? (
          <p className="text-sm text-ink/70">Loading availability…</p>
        ) : error ? (
          <p role="alert" className="text-sm text-coral-dark">
            {error}
          </p>
        ) : slots.length === 0 ? (
          <p className="text-sm text-ink/70">
            No openings on this day. Try another date - our team is also
            available later this week.
          </p>
        ) : (
          <div
            role="radiogroup"
            aria-labelledby="step-slot"
            className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4"
          >
            {slots.map((slot) => {
              const checked = selectedSlot === slot.startAt;
              const isBooked = slot.therapistIds.length === 0;
              return (
                <button
                  key={slot.startAt}
                  type="button"
                  role="radio"
                  aria-checked={checked}
                  aria-disabled={isBooked}
                  disabled={isBooked}
                  title={isBooked ? "Already booked" : undefined}
                  onClick={() => {
                    if (isBooked) return;
                    setSelectedSlot(slot.startAt);
                    // If only one therapist available, auto-select them.
                    setSelectedTherapist(
                      slot.therapistIds.length === 1
                        ? slot.therapistIds[0]!
                        : null,
                    );
                  }}
                  className={cn(
                    "flex w-full min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl px-2 py-2 text-sm font-medium ring-1 transition",
                    isBooked
                      ? "bg-blush/30 text-ink/35 ring-coral/10 cursor-not-allowed line-through"
                      : checked
                      ? "bg-coral text-cream ring-coral"
                      : "bg-cream text-coral-dark ring-coral/20 hover:ring-coral/50",
                  )}
                >
                  <span className={cn(!isBooked && "font-semibold")}>
                    {formatInTimeZone(slot.startAt, tz, "h:mm a")}
                  </span>
                  <span
                    className={cn(
                      "text-[10px] uppercase tracking-wide",
                      isBooked
                        ? "text-ink/35 no-underline"
                        : checked
                        ? "text-cream/85"
                        : "text-ink/55",
                    )}
                  >
                    {isBooked
                      ? "Booked"
                      : `${slot.therapistIds.length} ${slot.therapistIds.length === 1 ? "therapist" : "therapists"}`}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* Therapist (only if a slot is picked) */}
      {selectedSlot && (
        <section
          ref={therapistSectionRef}
          aria-labelledby="step-therapist"
          className="space-y-3"
        >
          <h2
            id="step-therapist"
            className="font-display text-xl text-coral-dark"
          >
            3. Pick your therapist
          </h2>
          {availableTherapistsForSlot.length === 0 ? (
            <p className="text-sm text-ink/70">
              No therapists are available for this exact slot - please pick
              another time.
            </p>
          ) : (
            <div
              role="radiogroup"
              aria-labelledby="step-therapist"
              className="grid gap-2 sm:grid-cols-2"
            >
              {availableTherapistsForSlot.map((t) => {
                const checked = selectedTherapist === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    role="radio"
                    aria-checked={checked}
                    onClick={() => setSelectedTherapist(t.id)}
                    className={cn(
                      "flex flex-col gap-1 rounded-2xl bg-cream/90 p-4 text-left ring-1 ring-coral/15 transition",
                      checked
                        ? "ring-2 ring-coral shadow-sm"
                        : "hover:ring-coral/40",
                    )}
                  >
                    <span className="font-display text-lg text-coral-dark">
                      {t.name}
                    </span>
                    {t.specialties.length > 0 && (
                      <span className="text-xs uppercase tracking-wide text-ink/55">
                        {t.specialties.join(" · ")}
                      </span>
                    )}
                    {t.bio && (
                      <span className="line-clamp-2 text-sm text-ink/75">
                        {t.bio}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </section>
      )}

      <div className="sticky bottom-3 flex justify-end">
        <button
          type="button"
          disabled={!selectedSlot || !selectedTherapist}
          onClick={handleContinue}
          className={cn(
            "rounded-full px-6 py-3 text-sm font-semibold transition",
            selectedSlot && selectedTherapist
              ? "bg-coral text-cream shadow-md hover:bg-coral-dark"
              : "cursor-not-allowed bg-blush/60 text-ink/50",
          )}
        >
          Continue →
        </button>
      </div>

      <p className="text-xs text-ink/60">
        Times shown in {formatInTimeZone(new Date(), tz, "zzz")}.
      </p>
    </div>
  );
}
