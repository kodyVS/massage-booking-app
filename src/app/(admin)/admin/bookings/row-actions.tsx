"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { BookingDTO } from "@/backend";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import {
  cancelBookingAction,
  markCompletedAction,
  markNoShowAction,
  rescheduleBookingAction,
} from "./actions";

export function BookingRowActions({ booking }: { booking: BookingDTO; tz: string }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [showReschedule, setShowReschedule] = useState(false);
  const [newStartLocal, setNewStartLocal] = useState("");

  function refresh() {
    router.refresh();
  }

  function cancel() {
    if (!confirm(`Cancel booking for ${booking.customerName}?`)) return;
    startTransition(async () => {
      const r = await cancelBookingAction(booking.id);
      if (r.ok) {
        toast.success("Booking cancelled");
        refresh();
      } else toast.error(r.error);
    });
  }

  function markNoShow() {
    startTransition(async () => {
      const r = await markNoShowAction(booking.id);
      if (r.ok) {
        toast.success("Marked no-show");
        refresh();
      } else toast.error(r.error);
    });
  }

  function markCompleted() {
    startTransition(async () => {
      const r = await markCompletedAction(booking.id);
      if (r.ok) {
        toast.success("Marked completed");
        refresh();
      } else toast.error(r.error);
    });
  }

  function reschedule(e: React.FormEvent) {
    e.preventDefault();
    if (!newStartLocal) return;
    // datetime-local is in user's local TZ; convert to UTC ISO.
    const iso = new Date(newStartLocal).toISOString();
    startTransition(async () => {
      const r = await rescheduleBookingAction(booking.id, iso);
      if (r.ok) {
        toast.success("Booking rescheduled");
        setShowReschedule(false);
        setNewStartLocal("");
        refresh();
      } else toast.error(r.error);
    });
  }

  const live = booking.status === "confirmed" || booking.status === "pending";

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap justify-end gap-1">
        <Link href={`/admin/bookings/${booking.id}`}>
          <Button size="sm" variant="secondary">
            View
          </Button>
        </Link>
        {live && (
          <>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowReschedule((p) => !p)}
              disabled={pending}
            >
              Reschedule
            </Button>
            <Button size="sm" variant="ghost" onClick={markCompleted} disabled={pending}>
              Complete
            </Button>
            <Button size="sm" variant="ghost" onClick={markNoShow} disabled={pending}>
              No-show
            </Button>
            <Button size="sm" variant="danger" onClick={cancel} disabled={pending}>
              Cancel
            </Button>
          </>
        )}
      </div>
      {showReschedule && (
        <form onSubmit={reschedule} className="flex items-center gap-2">
          <Input
            type="datetime-local"
            value={newStartLocal}
            onChange={(e) => setNewStartLocal(e.target.value)}
            className="w-56"
            required
          />
          <Button type="submit" size="sm" disabled={pending}>
            Save
          </Button>
        </form>
      )}
    </div>
  );
}
