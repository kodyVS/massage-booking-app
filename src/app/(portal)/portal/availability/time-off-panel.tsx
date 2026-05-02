"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { TimeOffDTO } from "@/backend";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { formatDateTime } from "@/lib/format";
import {
  deleteMyTimeOffAction,
  requestTimeOffAction,
} from "@/app/(portal)/portal/actions";

export function TimeOffPanel({
  timeOff,
  tz,
}: {
  timeOff: TimeOffDTO[];
  tz: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!start || !end) {
      setError("Pick a start and end time");
      return;
    }
    const startIso = new Date(start).toISOString();
    const endIso = new Date(end).toISOString();
    if (startIso >= endIso) {
      setError("End must be after start");
      return;
    }
    startTransition(async () => {
      const r = await requestTimeOffAction(startIso, endIso, reason || undefined);
      if (r.ok) {
        toast.success("Time off requested");
        setStart("");
        setEnd("");
        setReason("");
        router.refresh();
      } else {
        setError(r.error);
        toast.error(r.error);
      }
    });
  }

  function remove(id: string) {
    if (!confirm("Withdraw this time-off entry?")) return;
    startTransition(async () => {
      const r = await deleteMyTimeOffAction(id);
      if (r.ok) {
        toast.success("Removed");
        router.refresh();
      } else toast.error(r.error);
    });
  }

  return (
    <>
      <section className="rounded-2xl bg-cream/80 p-5 ring-1 ring-coral/10">
        <h2 className="font-display text-xl text-coral-dark">Request time off</h2>
        <form onSubmit={submit} className="mt-3 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Start" htmlFor="off-start" required>
              <Input
                id="off-start"
                type="datetime-local"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                required
              />
            </Field>
            <Field label="End" htmlFor="off-end" required>
              <Input
                id="off-end"
                type="datetime-local"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                required
              />
            </Field>
          </div>
          <Field label="Reason (optional)" htmlFor="off-reason">
            <Input
              id="off-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Vacation, appointment…"
            />
          </Field>
          {error && (
            <p role="alert" className="text-sm text-coral-dark">
              {error}
            </p>
          )}
          <div className="flex justify-end">
            <Button type="submit" disabled={pending}>
              {pending ? "Submitting…" : "Submit request"}
            </Button>
          </div>
        </form>
      </section>

      <section className="rounded-2xl bg-cream/80 p-5 ring-1 ring-coral/10">
        <h2 className="font-display text-xl text-coral-dark">Your time-off entries</h2>
        {timeOff.length === 0 ? (
          <p className="mt-2 text-sm text-ink/60">No entries yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-coral/10">
            {timeOff.map((t) => (
              <li
                key={t.id}
                className="flex flex-wrap items-center justify-between gap-3 py-2 text-sm"
              >
                <div>
                  <p className="text-ink">
                    {formatDateTime(t.startAt, tz)} → {formatDateTime(t.endAt, tz)}
                  </p>
                  {t.reason && <p className="text-xs text-ink/60">“{t.reason}”</p>}
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    tone={
                      t.status === "approved"
                        ? "success"
                        : t.status === "pending"
                          ? "warning"
                          : "danger"
                    }
                  >
                    {t.status}
                  </Badge>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => remove(t.id)}
                    disabled={pending}
                  >
                    Remove
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
