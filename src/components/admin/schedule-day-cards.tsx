"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { formatInTimeZone } from "date-fns-tz";
import type {
  BookingDTO,
  ServiceDTO,
  TherapistDTO,
  TimeOffDTO,
} from "@/backend";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";
import {
  blockTimeAction,
  deleteBlockAction,
} from "@/app/(admin)/admin/schedules/actions";

interface Props {
  therapists: TherapistDTO[];
  services: ServiceDTO[];
  weekStartIso: string;
  bookings: BookingDTO[];
  timeOff: TimeOffDTO[];
  tz: string;
}

interface DayItem {
  kind: "booking" | "block";
  id: string;
  startAt: string;
  endAt: string;
  /** booking only */
  customerName?: string;
  serviceLabel?: string;
  status?: BookingDTO["status"];
  /** block only */
  reason?: string;
}

const STATUS_LABEL: Record<BookingDTO["status"], string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  cancelled: "Cancelled",
  completed: "Completed",
  no_show: "No-show",
};

const STATUS_TONE: Record<BookingDTO["status"], string> = {
  pending: "bg-blush/60 text-coral-dark",
  confirmed: "bg-coral/15 text-coral-dark",
  cancelled: "bg-ink/10 text-ink/55 line-through",
  completed: "bg-periwinkle/30 text-ink",
  no_show: "bg-ink/10 text-ink/55",
};

export function ScheduleDayCards({
  therapists,
  services,
  weekStartIso,
  bookings,
  timeOff,
  tz,
}: Props) {
  const serviceMap = new Map(services.map((s) => [s.id, s]));
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [blockFor, setBlockFor] = useState<{
    therapistId: string;
    date: string;
  } | null>(null);
  const [start, setStart] = useState("12:00");
  const [end, setEnd] = useState("13:00");
  const [reason, setReason] = useState("");

  const weekStart = new Date(weekStartIso);
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setUTCDate(d.getUTCDate() + i);
    return d;
  });

  function itemsFor(therapistId: string, dayIso: string): DayItem[] {
    const dayBookings: DayItem[] = bookings
      .filter((b) => b.therapistId === therapistId)
      .filter((b) => b.status !== "cancelled")
      .filter((b) => formatInTimeZone(b.startAt, tz, "yyyy-MM-dd") === dayIso)
      .map((b) => {
        const svc = serviceMap.get(b.serviceId);
        const label = svc
          ? `${svc.name} · ${svc.durationMin} min`
          : "Service";
        return {
          kind: "booking" as const,
          id: b.id,
          startAt: b.startAt,
          endAt: b.endAt,
          customerName: b.customerName,
          serviceLabel: label,
          status: b.status,
        };
      });
    const dayBlocks: DayItem[] = timeOff
      .filter((t) => t.therapistId === therapistId && t.status === "approved")
      .filter(
        (t) => formatInTimeZone(t.startAt, tz, "yyyy-MM-dd") === dayIso,
      )
      .map((t) => ({
        kind: "block" as const,
        id: t.id,
        startAt: t.startAt,
        endAt: t.endAt,
        reason: t.reason,
      }));
    return [...dayBookings, ...dayBlocks].sort((a, b) =>
      a.startAt.localeCompare(b.startAt),
    );
  }

  function openBlock(therapistId: string, date: string) {
    setBlockFor({ therapistId, date });
    setStart("12:00");
    setEnd("13:00");
    setReason("");
  }

  function submitBlock(e: React.FormEvent) {
    e.preventDefault();
    if (!blockFor) return;
    const startIso = new Date(`${blockFor.date}T${start}:00`).toISOString();
    const endIso = new Date(`${blockFor.date}T${end}:00`).toISOString();
    startTransition(async () => {
      const r = await blockTimeAction(
        blockFor.therapistId,
        startIso,
        endIso,
        reason || undefined,
      );
      if (r.ok) {
        toast.success("Time blocked");
        setBlockFor(null);
        router.refresh();
      } else toast.error(r.error);
    });
  }

  function deleteBlock(id: string, therapistId: string) {
    if (!confirm("Remove this time block?")) return;
    startTransition(async () => {
      const r = await deleteBlockAction(id, therapistId);
      if (r.ok) {
        toast.success("Block removed");
        router.refresh();
      } else toast.error(r.error);
    });
  }

  return (
    <div className="space-y-5">
      {days.map((d) => {
        const dayIso = d.toISOString().slice(0, 10);
        const isToday =
          formatInTimeZone(new Date(), tz, "yyyy-MM-dd") === dayIso;
        const totalCount = therapists.reduce(
          (sum, t) => sum + itemsFor(t.id, dayIso).length,
          0,
        );

        return (
          <section
            key={dayIso}
            className={cn(
              "rounded-2xl bg-cream/85 ring-1 ring-coral/10",
              isToday && "ring-2 ring-coral/40",
            )}
          >
            <header className="flex flex-wrap items-baseline justify-between gap-2 border-b border-coral/10 px-5 py-3">
              <div className="flex items-baseline gap-3">
                <h2 className="font-display text-xl text-coral-dark">
                  {formatInTimeZone(d, tz, "EEEE")}
                </h2>
                <span className="text-sm text-ink/60">
                  {formatInTimeZone(d, tz, "MMMM d")}
                </span>
                {isToday && (
                  <span className="rounded-full bg-coral/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-coral-dark">
                    Today
                  </span>
                )}
              </div>
              <span className="text-xs uppercase tracking-wide text-ink/50">
                {totalCount === 0
                  ? "No appointments"
                  : `${totalCount} appointment${totalCount === 1 ? "" : "s"}`}
              </span>
            </header>

            <div className="grid divide-y divide-coral/10 sm:grid-cols-2 sm:divide-x sm:divide-y-0">
              {therapists.map((t) => {
                const items = itemsFor(t.id, dayIso);
                return (
                  <div key={t.id} className="space-y-2 p-5">
                    <div className="flex items-center justify-between">
                      <h3 className="font-display text-base text-ink">
                        {t.name}
                      </h3>
                      <button
                        type="button"
                        onClick={() => openBlock(t.id, dayIso)}
                        className="text-[11px] font-medium text-coral-dark hover:underline"
                      >
                        + Block time
                      </button>
                    </div>

                    {items.length === 0 ? (
                      <p className="rounded-lg bg-blush/20 px-3 py-4 text-center text-xs text-ink/55">
                        No appointments
                      </p>
                    ) : (
                      <ul className="space-y-1.5">
                        {items.map((item) => {
                          if (item.kind === "block") {
                            return (
                              <li
                                key={item.id}
                                className="flex items-start gap-3 rounded-lg bg-periwinkle/30 px-3 py-2"
                              >
                                <div className="w-20 shrink-0 font-mono text-[11px] text-ink/70">
                                  {formatInTimeZone(item.startAt, tz, "h:mm a")}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="text-sm text-ink">
                                    {item.reason || "Blocked time"}
                                  </div>
                                  <div className="text-[11px] text-ink/55">
                                    until{" "}
                                    {formatInTimeZone(item.endAt, tz, "h:mm a")}
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => deleteBlock(item.id, t.id)}
                                  className="text-[11px] text-coral-dark hover:underline"
                                >
                                  Remove
                                </button>
                              </li>
                            );
                          }
                          // booking
                          const status = item.status!;
                          return (
                            <li key={item.id}>
                              <Link
                                href={`/admin/bookings/${item.id}`}
                                className={cn(
                                  "flex items-start gap-3 rounded-lg px-3 py-2 transition",
                                  STATUS_TONE[status],
                                  "hover:brightness-95",
                                )}
                              >
                                <div className="w-20 shrink-0 font-mono text-[11px] font-semibold">
                                  {formatInTimeZone(item.startAt, tz, "h:mm a")}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="truncate text-sm font-medium">
                                    {item.customerName}
                                  </div>
                                  <div className="text-[11px] opacity-80">
                                    {item.serviceLabel}
                                    {" · until "}
                                    {formatInTimeZone(item.endAt, tz, "h:mm a")}
                                  </div>
                                </div>
                                <span className="text-[10px] uppercase tracking-wide opacity-70">
                                  {STATUS_LABEL[status]}
                                </span>
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}

      {blockFor && (
        <div className="sticky bottom-3 z-10 rounded-2xl bg-blush/80 p-4 shadow-md ring-1 ring-coral/30 backdrop-blur">
          <form
            onSubmit={submitBlock}
            className="flex flex-wrap items-end gap-3"
          >
            <p className="w-full text-sm font-medium text-ink">
              Block time on{" "}
              <span className="text-coral-dark">{blockFor.date}</span> for{" "}
              {therapists.find((t) => t.id === blockFor.therapistId)?.name}
            </p>
            <label className="text-xs">
              <span className="block text-ink/60">Start</span>
              <Input
                type="time"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                className="mt-1"
                required
              />
            </label>
            <label className="text-xs">
              <span className="block text-ink/60">End</span>
              <Input
                type="time"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                className="mt-1"
                required
              />
            </label>
            <label className="text-xs flex-1 min-w-[180px]">
              <span className="block text-ink/60">Reason (optional)</span>
              <Input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="mt-1"
                placeholder="Lunch, meeting, etc."
              />
            </label>
            <Button type="submit" size="sm" disabled={pending}>
              Save block
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setBlockFor(null)}
            >
              Cancel
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}
