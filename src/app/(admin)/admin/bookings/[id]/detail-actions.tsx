"use client";

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
} from "../actions";

export function BookingDetailActions({ booking }: { booking: BookingDTO }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
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
    const iso = new Date(newStartLocal).toISOString();
    startTransition(async () => {
      const r = await rescheduleBookingAction(booking.id, iso);
      if (r.ok) {
        toast.success("Booking rescheduled");
        setNewStartLocal("");
        refresh();
      } else toast.error(r.error);
    });
  }

  const live = booking.status === "confirmed" || booking.status === "pending";

  return (
    <div className="mt-3 space-y-3">
      <form onSubmit={reschedule} className="flex flex-wrap items-end gap-2">
        <label className="text-xs">
          <span className="block text-ink/60">New start</span>
          <Input
            type="datetime-local"
            value={newStartLocal}
            onChange={(e) => setNewStartLocal(e.target.value)}
            className="mt-1 w-64"
            disabled={!live}
          />
        </label>
        <Button type="submit" size="md" disabled={pending || !live || !newStartLocal}>
          Reschedule
        </Button>
      </form>
      <div className="flex flex-wrap gap-2">
        <Button size="md" variant="ghost" onClick={markCompleted} disabled={pending || !live}>
          Mark completed
        </Button>
        <Button size="md" variant="ghost" onClick={markNoShow} disabled={pending || !live}>
          Mark no-show
        </Button>
        <Button size="md" variant="danger" onClick={cancel} disabled={pending || !live}>
          Cancel booking
        </Button>
      </div>
    </div>
  );
}
