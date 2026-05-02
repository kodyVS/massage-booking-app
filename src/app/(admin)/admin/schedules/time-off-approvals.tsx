"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import type { TherapistDTO, TimeOffDTO } from "@/backend";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { formatDateTime } from "@/lib/format";
import { approveTimeOffAction, rejectTimeOffAction } from "./actions";

export function TimeOffApprovals({
  therapists,
  pending,
  tz,
}: {
  therapists: TherapistDTO[];
  pending: TimeOffDTO[];
  tz: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [working, startTransition] = useTransition();
  const tName = new Map(therapists.map((t) => [t.id, t.name]));

  function approve(id: string) {
    startTransition(async () => {
      const r = await approveTimeOffAction(id);
      if (r.ok) {
        toast.success("Time off approved");
        router.refresh();
      } else toast.error(r.error);
    });
  }

  function reject(id: string) {
    if (!confirm("Reject this request?")) return;
    startTransition(async () => {
      const r = await rejectTimeOffAction(id);
      if (r.ok) {
        toast.success("Request rejected");
        router.refresh();
      } else toast.error(r.error);
    });
  }

  return (
    <section className="rounded-2xl bg-cream/80 p-5 ring-1 ring-coral/10">
      <h2 className="font-display text-xl text-coral-dark">Pending time-off requests</h2>
      {pending.length === 0 ? (
        <p className="mt-2 text-sm text-ink/60">No pending requests.</p>
      ) : (
        <ul className="mt-3 divide-y divide-coral/10">
          {pending.map((p) => (
            <li
              key={p.id}
              className="flex flex-wrap items-center justify-between gap-3 py-2 text-sm"
            >
              <div>
                <p className="font-medium text-ink">
                  {tName.get(p.therapistId) ?? "Therapist"}
                </p>
                <p className="text-xs text-ink/60">
                  {formatDateTime(p.startAt, tz)} → {formatDateTime(p.endAt, tz)}
                </p>
                {p.reason && <p className="text-xs text-ink/60">“{p.reason}”</p>}
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => approve(p.id)} disabled={working}>
                  Approve
                </Button>
                <Button size="sm" variant="ghost" onClick={() => reject(p.id)} disabled={working}>
                  Reject
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
