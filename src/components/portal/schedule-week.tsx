"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { formatInTimeZone } from "date-fns-tz";
import type { BookingDTO, TherapistDTO, TimeOffDTO } from "@/backend";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { blockTimeAction, deleteBlockAction } from "@/app/(admin)/admin/schedules/actions";

interface Props {
  therapists: TherapistDTO[];
  weekStartIso: string;
  bookings: BookingDTO[];
  timeOff: TimeOffDTO[];
  tz: string;
  /** Admin gets to block-off any therapist; portal limits to self. */
  canBlock?: boolean;
  /** When a worker uses this view, restrict to their therapistId. */
  restrictToTherapistId?: string;
  /** Where the booking row links to (admin: /admin/bookings/[id], portal: /portal/bookings/[id]). */
  bookingHrefPrefix?: string;
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function ScheduleWeek({
  therapists,
  weekStartIso,
  bookings,
  timeOff,
  tz,
  canBlock,
  restrictToTherapistId,
  bookingHrefPrefix = "/admin/bookings",
}: Props) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [blockFor, setBlockFor] = useState<{
    therapistId: string;
    date: string;
  } | null>(null);
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("10:00");
  const [reason, setReason] = useState("");

  const weekStart = new Date(weekStartIso);
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setUTCDate(d.getUTCDate() + i);
    return d;
  });
  const visibleTherapists = restrictToTherapistId
    ? therapists.filter((t) => t.id === restrictToTherapistId)
    : therapists;

  function bookingsFor(therapistId: string, dayIso: string) {
    return bookings
      .filter((b) => b.therapistId === therapistId)
      .filter((b) => formatInTimeZone(b.startAt, tz, "yyyy-MM-dd") === dayIso)
      .filter((b) => b.status !== "cancelled")
      .sort((a, b) => a.startAt.localeCompare(b.startAt));
  }

  function blocksFor(therapistId: string, dayIso: string) {
    return timeOff
      .filter((t) => t.therapistId === therapistId && t.status === "approved")
      .filter((t) => {
        const tDay = formatInTimeZone(t.startAt, tz, "yyyy-MM-dd");
        return tDay === dayIso;
      });
  }

  function openBlock(therapistId: string, date: string) {
    setBlockFor({ therapistId, date });
    setStart("09:00");
    setEnd("10:00");
    setReason("");
  }

  function submitBlock(e: React.FormEvent) {
    e.preventDefault();
    if (!blockFor) return;
    const startIso = new Date(`${blockFor.date}T${start}:00`).toISOString();
    const endIso = new Date(`${blockFor.date}T${end}:00`).toISOString();
    startTransition(async () => {
      const r = await blockTimeAction(blockFor.therapistId, startIso, endIso, reason || undefined);
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
    <div className="overflow-x-auto rounded-2xl bg-cream/80 ring-1 ring-coral/10">
      <table className="min-w-full text-xs">
        <thead className="bg-blush/40 text-left uppercase tracking-wide text-ink/60">
          <tr>
            <th className="sticky left-0 z-10 bg-blush/40 px-3 py-2">Therapist</th>
            {days.map((d, i) => (
              <th key={i} className="px-3 py-2">
                <div>{DAYS[d.getUTCDay()]}</div>
                <div className="font-mono text-[10px] text-ink/50">
                  {d.toISOString().slice(5, 10)}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-coral/5">
          {visibleTherapists.map((t) => (
            <tr key={t.id}>
              <td className="sticky left-0 z-10 bg-cream/80 px-3 py-2 align-top text-sm font-medium text-ink">
                {t.name}
              </td>
              {days.map((d, idx) => {
                const dayIso = d.toISOString().slice(0, 10);
                const dayBookings = bookingsFor(t.id, dayIso);
                const dayBlocks = blocksFor(t.id, dayIso);
                return (
                  <td
                    key={idx}
                    className="min-w-[120px] px-2 py-2 align-top"
                  >
                    <ul className="space-y-1">
                      {dayBookings.map((b) => (
                        <li key={b.id}>
                          <Link
                            href={`${bookingHrefPrefix}/${b.id}`}
                            className="block rounded-md bg-coral/15 px-2 py-1 text-coral-dark hover:bg-coral/30"
                          >
                            <span className="block font-mono text-[11px]">
                              {formatInTimeZone(b.startAt, tz, "h:mm a")}
                            </span>
                            <span className="block truncate text-[11px]">
                              {b.customerName}
                            </span>
                          </Link>
                        </li>
                      ))}
                      {dayBlocks.map((blk) => (
                        <li
                          key={blk.id}
                          className="rounded-md bg-periwinkle/40 px-2 py-1 text-ink"
                        >
                          <span className="block font-mono text-[11px]">
                            {formatInTimeZone(blk.startAt, tz, "h:mm a")}–
                            {formatInTimeZone(blk.endAt, tz, "h:mm a")}
                          </span>
                          <span className="block truncate text-[11px]">
                            {blk.reason || "Blocked"}
                          </span>
                          {canBlock && (
                            <button
                              type="button"
                              onClick={() => deleteBlock(blk.id, t.id)}
                              className="mt-0.5 text-[10px] text-coral-dark hover:underline"
                            >
                              Remove
                            </button>
                          )}
                        </li>
                      ))}
                    </ul>
                    {canBlock && (
                      <button
                        type="button"
                        onClick={() => openBlock(t.id, dayIso)}
                        className="mt-1 block w-full rounded-md border border-dashed border-coral/30 px-2 py-1 text-[10px] text-ink/60 hover:bg-blush/30"
                      >
                        + Block
                      </button>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      {blockFor && (
        <div className="border-t border-coral/10 bg-blush/30 p-4">
          <form onSubmit={submitBlock} className="flex flex-wrap items-end gap-3">
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
