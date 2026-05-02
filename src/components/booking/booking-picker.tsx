"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { formatInTimeZone } from "date-fns-tz";
import type { AvailableSlotDTO, ServiceDTO, TherapistDTO } from "@/backend";
import { cn } from "@/lib/cn";
import { DateStrip } from "./date-strip";
import { ServicePicker } from "./service-picker";

interface Props {
  therapist: TherapistDTO;
  services: ServiceDTO[];
  tz: string;
}

interface AvailabilityResult {
  key: string;
  slots: AvailableSlotDTO[];
  error: string | null;
}

export function BookingPicker({ therapist, services, tz }: Props) {
  const router = useRouter();
  const [serviceId, setServiceId] = useState<string | null>(
    services.length === 1 ? services[0]!.id : null,
  );
  const todayStr = useMemo(
    () => formatInTimeZone(new Date(), tz, "yyyy-MM-dd"),
    [tz],
  );
  const [date, setDate] = useState<string>(todayStr);
  const [result, setResult] = useState<AvailabilityResult | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

  // Derive loading from a request-key comparison so we never call setState
  // synchronously in an effect just to flip a "loading" flag.
  const requestKey = serviceId ? `${therapist.id}|${serviceId}|${date}` : null;
  const loading = requestKey !== null && result?.key !== requestKey;
  const slots = result?.key === requestKey ? result.slots : [];
  const error = result?.key === requestKey ? result.error : null;

  useEffect(() => {
    if (!requestKey || !serviceId) return;
    let cancelled = false;
    const url = `/api/availability?therapistId=${therapist.id}&serviceId=${serviceId}&date=${date}`;
    fetch(url, { headers: { Accept: "application/json" } })
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (data.ok) {
          setResult({
            key: requestKey,
            slots: data.data as AvailableSlotDTO[],
            error: null,
          });
        } else {
          setResult({
            key: requestKey,
            slots: [],
            error: data.error?.message ?? "Could not load availability",
          });
        }
        setSelectedSlot(null);
      })
      .catch(() => {
        if (cancelled) return;
        setResult({
          key: requestKey,
          slots: [],
          error: "Could not load availability. Please retry.",
        });
        setSelectedSlot(null);
      });
    return () => {
      cancelled = true;
    };
  }, [requestKey, therapist.id, serviceId, date]);

  function handleContinue() {
    if (!serviceId || !selectedSlot) return;
    const params = new URLSearchParams({
      therapistId: therapist.id,
      serviceId,
      startAt: selectedSlot,
    });
    router.push(`/book/confirm?${params.toString()}`);
  }

  return (
    <div className="space-y-8">
      {/* Service */}
      <section aria-labelledby="step-service" className="space-y-3">
        <h2 id="step-service" className="font-display text-xl text-coral-dark">
          1. Choose a service
        </h2>
        {services.length === 0 ? (
          <p className="text-sm text-ink/70">
            This therapist hasn&apos;t been linked to any services yet.
          </p>
        ) : (
          <ServicePicker
            services={services}
            selectedId={serviceId}
            onSelect={setServiceId}
          />
        )}
      </section>

      {/* Date */}
      <section aria-labelledby="step-date" className="space-y-3">
        <h2 id="step-date" className="font-display text-xl text-coral-dark">
          2. Pick a date
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
          3. Pick a time
        </h2>
        {!serviceId ? (
          <p className="text-sm text-ink/70">
            Pick a service to see available times.
          </p>
        ) : loading ? (
          <p className="text-sm text-ink/70">Loading availability…</p>
        ) : error ? (
          <p role="alert" className="text-sm text-coral-dark">
            {error}
          </p>
        ) : slots.length === 0 ? (
          <p className="text-sm text-ink/70">
            No openings on this day. Try a different date.
          </p>
        ) : (
          <div
            role="radiogroup"
            aria-labelledby="step-slot"
            className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5"
          >
            {slots.map((slot) => {
              const checked = selectedSlot === slot.startAt;
              return (
                <button
                  key={slot.startAt}
                  type="button"
                  role="radio"
                  aria-checked={checked}
                  onClick={() => setSelectedSlot(slot.startAt)}
                  className={cn(
                    // Tap target: min 44px tall on mobile (py-3 + text-sm = ~44px).
                    "w-full min-h-11 rounded-xl px-2 py-3 text-sm font-medium ring-1 ring-coral/20 transition",
                    checked
                      ? "bg-coral text-cream ring-coral"
                      : "bg-cream text-coral-dark hover:ring-coral/50",
                  )}
                >
                  {formatInTimeZone(slot.startAt, tz, "h:mm a")}
                </button>
              );
            })}
          </div>
        )}
      </section>

      <div className="sticky bottom-3 flex justify-end">
        <button
          type="button"
          disabled={!serviceId || !selectedSlot}
          onClick={handleContinue}
          className={cn(
            "rounded-full px-6 py-3 text-sm font-semibold transition",
            serviceId && selectedSlot
              ? "bg-coral text-cream shadow-md hover:bg-coral-dark"
              : "cursor-not-allowed bg-blush/60 text-ink/50",
          )}
        >
          Continue →
        </button>
      </div>

      <p className="text-xs text-ink/60">
        Booking with <span className="font-medium">{therapist.name}</span>.
        Times shown in{" "}
        {formatInTimeZone(new Date(), tz, "zzz")}.
      </p>
    </div>
  );
}
