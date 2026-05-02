"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatInTimeZone } from "date-fns-tz";
import type { AvailableSlotDTO, ServiceDTO, TherapistDTO } from "@/backend";
import { cn } from "@/lib/cn";
import { ServicePicker } from "./service-picker";

interface Props {
  services: ServiceDTO[];
  therapists: TherapistDTO[];
  tz: string;
}

export function AnyTherapistPicker({ services, therapists, tz }: Props) {
  const router = useRouter();
  const therapistMap = new Map(therapists.map((t) => [t.id, t]));
  const [serviceId, setServiceId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [slot, setSlot] = useState<AvailableSlotDTO | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  async function findFirst() {
    if (!serviceId) return;
    setLoading(true);
    setError(null);
    setSlot(null);
    setSearched(true);
    try {
      const url = `/api/availability?mode=first-available&serviceId=${serviceId}&daysAhead=30`;
      const r = await fetch(url, { headers: { Accept: "application/json" } });
      const data = await r.json();
      if (data.ok) {
        setSlot(data.data as AvailableSlotDTO | null);
      } else {
        setError(data.error?.message ?? "Could not find an opening.");
      }
    } catch {
      setError("Network error - please retry.");
    } finally {
      setLoading(false);
    }
  }

  function handleBook() {
    if (!slot || !serviceId) return;
    const params = new URLSearchParams({
      therapistId: slot.therapistId,
      serviceId,
      startAt: slot.startAt,
    });
    router.push(`/book/confirm?${params.toString()}`);
  }

  const therapist = slot ? therapistMap.get(slot.therapistId) : null;

  return (
    <div className="space-y-8">
      <section aria-labelledby="any-step-service" className="space-y-3">
        <h2 id="any-step-service" className="font-display text-xl text-coral-dark">
          1. Choose a service
        </h2>
        <ServicePicker
          services={services}
          selectedId={serviceId}
          onSelect={setServiceId}
        />
      </section>

      <button
        type="button"
        disabled={!serviceId || loading}
        onClick={findFirst}
        className={cn(
          "rounded-full px-6 py-3 text-sm font-semibold transition",
          serviceId && !loading
            ? "bg-coral text-cream shadow-md hover:bg-coral-dark"
            : "cursor-not-allowed bg-blush/60 text-ink/50",
        )}
      >
        {loading ? "Searching…" : "Find earliest opening"}
      </button>

      {error && (
        <p role="alert" className="text-sm text-coral-dark">
          {error}
        </p>
      )}

      {searched && !loading && !slot && !error && (
        <p className="text-sm text-ink/70">
          No openings in the next 30 days. Try a specific therapist.
        </p>
      )}

      {slot && therapist && (
        <section
          aria-labelledby="any-found"
          className="rounded-2xl bg-blush/40 p-5 ring-1 ring-coral/20"
        >
          <h2 id="any-found" className="font-display text-xl text-coral-dark">
            Earliest opening
          </h2>
          <p className="mt-2 text-ink/85">
            <span className="font-semibold">
              {formatInTimeZone(slot.startAt, tz, "EEE, MMM d")}
            </span>{" "}
            at{" "}
            <span className="font-semibold">
              {formatInTimeZone(slot.startAt, tz, "h:mm a")}
            </span>{" "}
            with <span className="font-semibold">{therapist.name}</span>
          </p>
          <button
            type="button"
            onClick={handleBook}
            className="mt-4 rounded-full bg-coral px-5 py-2.5 text-sm font-semibold text-cream transition hover:bg-coral-dark"
          >
            Book this slot →
          </button>
        </section>
      )}
    </div>
  );
}
