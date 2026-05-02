"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { formatInTimeZone } from "date-fns-tz";
import type { AvailableSlotDTO } from "@/backend";
import { cn } from "@/lib/cn";
import { DateStrip } from "./date-strip";

interface Props {
  token: string;
  therapistId: string;
  serviceId: string;
  tz: string;
  status: string;
}

type View = "idle" | "reschedule" | "cancel-confirm";

export function ManageBookingActions({
  token,
  therapistId,
  serviceId,
  tz,
  status,
}: Props) {
  const router = useRouter();
  const [view, setView] = useState<View>("idle");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const todayStr = useMemo(
    () => formatInTimeZone(new Date(), tz, "yyyy-MM-dd"),
    [tz],
  );
  const [date, setDate] = useState<string>(todayStr);
  const [result, setResult] = useState<{ key: string; slots: AvailableSlotDTO[] } | null>(null);

  const requestKey = view === "reschedule" ? `${date}` : null;
  const loadingSlots = requestKey !== null && result?.key !== requestKey;
  const slots = result?.key === requestKey ? result.slots : [];

  useEffect(() => {
    if (!requestKey) return;
    let cancelled = false;
    fetch(
      `/api/availability?therapistId=${therapistId}&serviceId=${serviceId}&date=${date}`,
    )
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        setResult({
          key: requestKey,
          slots: data.ok ? (data.data as AvailableSlotDTO[]) : [],
        });
      })
      .catch(() => {
        if (cancelled) return;
        setResult({ key: requestKey, slots: [] });
      });
    return () => {
      cancelled = true;
    };
  }, [requestKey, therapistId, serviceId, date]);

  async function reschedule(newStartAt: string) {
    setBusy(true);
    setError(null);
    try {
      const r = await fetch(`/api/bookings/${encodeURIComponent(token)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newStartAt }),
      });
      const data = await r.json();
      if (!data.ok) {
        setError(data.error?.message ?? "Could not reschedule.");
        return;
      }
      setSuccess("Booking rescheduled.");
      setView("idle");
      router.refresh();
    } catch {
      setError("Network error — please retry.");
    } finally {
      setBusy(false);
    }
  }

  async function cancel() {
    setBusy(true);
    setError(null);
    try {
      const r = await fetch(`/api/bookings/${encodeURIComponent(token)}`, {
        method: "DELETE",
      });
      const data = await r.json();
      if (!data.ok) {
        setError(data.error?.message ?? "Could not cancel.");
        return;
      }
      setSuccess("Booking cancelled.");
      setView("idle");
      router.refresh();
    } catch {
      setError("Network error — please retry.");
    } finally {
      setBusy(false);
    }
  }

  if (status === "cancelled") {
    return (
      <p className="rounded-2xl bg-cream/70 px-5 py-4 text-sm text-ink/70 ring-1 ring-coral/10">
        This booking has been cancelled.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {success && (
        <p className="rounded-xl bg-periwinkle/30 px-4 py-2 text-sm text-ink/85">
          {success}
        </p>
      )}
      {error && (
        <p role="alert" className="rounded-xl bg-coral/15 px-4 py-2 text-sm text-coral-dark">
          {error}
        </p>
      )}

      {view === "idle" && (
        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => setView("reschedule")}
            className="rounded-full bg-coral px-5 py-2.5 text-sm font-semibold text-cream transition hover:bg-coral-dark"
          >
            Reschedule
          </button>
          <button
            type="button"
            onClick={() => setView("cancel-confirm")}
            className="rounded-full border border-coral/30 px-5 py-2.5 text-sm font-medium text-coral-dark transition hover:bg-blush/60"
          >
            Cancel booking
          </button>
        </div>
      )}

      {view === "cancel-confirm" && (
        <div className="space-y-3 rounded-2xl bg-blush/40 p-4 ring-1 ring-coral/15">
          <p className="text-sm text-ink/85">
            Are you sure you want to cancel this booking?
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              disabled={busy}
              onClick={cancel}
              className="rounded-full bg-coral px-5 py-2 text-sm font-semibold text-cream transition hover:bg-coral-dark disabled:opacity-60"
            >
              {busy ? "Cancelling…" : "Yes, cancel"}
            </button>
            <button
              type="button"
              onClick={() => setView("idle")}
              className="rounded-full border border-coral/30 px-5 py-2 text-sm font-medium text-coral-dark"
            >
              Keep my booking
            </button>
          </div>
        </div>
      )}

      {view === "reschedule" && (
        <div className="space-y-3 rounded-2xl bg-cream/90 p-4 ring-1 ring-coral/15">
          <h3 className="font-display text-lg text-coral-dark">
            Pick a new time
          </h3>
          <DateStrip selected={date} onSelect={setDate} tz={tz} />
          {loadingSlots ? (
            <p className="text-sm text-ink/70">Loading…</p>
          ) : slots.length === 0 ? (
            <p className="text-sm text-ink/70">
              No openings on this day. Try a different date.
            </p>
          ) : (
            <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
              {slots.map((s) => (
                <li key={s.startAt}>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => reschedule(s.startAt)}
                    className={cn(
                      "w-full rounded-xl bg-cream px-2 py-3 text-sm font-medium text-coral-dark ring-1 ring-coral/20 transition hover:ring-coral/50 disabled:opacity-60",
                    )}
                  >
                    {formatInTimeZone(s.startAt, tz, "h:mm a")}
                  </button>
                </li>
              ))}
            </ul>
          )}
          <button
            type="button"
            onClick={() => setView("idle")}
            className="text-sm text-ink/65 underline-offset-4 hover:underline"
          >
            ← Back
          </button>
        </div>
      )}
    </div>
  );
}
