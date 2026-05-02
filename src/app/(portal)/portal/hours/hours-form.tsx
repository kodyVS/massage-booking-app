"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { WorkingHoursDTO } from "@/backend";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";
import { setMyHoursAction } from "@/app/(portal)/portal/actions";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface DayState {
  enabled: boolean;
  startTime: string;
  endTime: string;
}

function buildInitial(initial: WorkingHoursDTO[]): DayState[] {
  // Take the first row per dayOfWeek; ignore extra rows for v1 single-block UI.
  const out: DayState[] = DAYS.map(() => ({
    enabled: false,
    startTime: "09:00",
    endTime: "17:00",
  }));
  for (const row of initial) {
    if (!out[row.dayOfWeek]?.enabled) {
      out[row.dayOfWeek] = {
        enabled: true,
        startTime: row.startTime,
        endTime: row.endTime,
      };
    }
  }
  return out;
}

export function HoursForm({
  initial,
  envelopeOpen,
  envelopeClose,
}: {
  initial: WorkingHoursDTO[];
  envelopeOpen: string;
  envelopeClose: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [days, setDays] = useState<DayState[]>(() => buildInitial(initial));
  const [error, setError] = useState<string | null>(null);

  function setDay(index: number, patch: Partial<DayState>) {
    setDays((prev) => prev.map((d, i) => (i === index ? { ...d, ...patch } : d)));
  }

  const envelopeMin = toMin(envelopeOpen);
  const envelopeMax = toMin(envelopeClose);

  function validate(): string | null {
    for (let i = 0; i < days.length; i++) {
      const d = days[i]!;
      if (!d.enabled) continue;
      const s = toMin(d.startTime);
      const e = toMin(d.endTime);
      if (s >= e) return `${DAYS[i]}: start must be before end`;
      if (s < envelopeMin || e > envelopeMax) {
        return `${DAYS[i]}: hours must fall inside ${envelopeOpen}–${envelopeClose}`;
      }
    }
    return null;
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const err = validate();
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    const payload = days
      .map((d, i) =>
        d.enabled
          ? { dayOfWeek: i, startTime: d.startTime, endTime: d.endTime }
          : null,
      )
      .filter((x): x is { dayOfWeek: number; startTime: string; endTime: string } => x !== null);
    startTransition(async () => {
      const r = await setMyHoursAction(payload);
      if (r.ok) {
        toast.success("Working hours saved");
        router.refresh();
      } else {
        setError(r.error);
        toast.error(r.error);
      }
    });
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      {DAYS.map((label, i) => {
        const d = days[i]!;
        return (
          <div
            key={label}
            className="flex flex-wrap items-center gap-3 rounded-2xl bg-cream/80 p-3 ring-1 ring-coral/10"
          >
            <div className="flex w-24 items-center gap-2">
              <Switch
                checked={d.enabled}
                onCheckedChange={(v) => setDay(i, { enabled: v })}
                ariaLabel={`Enable ${label}`}
              />
              <span className="text-sm font-medium text-ink">{label}</span>
            </div>
            <label className="flex items-center gap-2 text-xs">
              <span className="text-ink/60">Start</span>
              <Input
                type="time"
                min={envelopeOpen}
                max={envelopeClose}
                value={d.startTime}
                onChange={(e) => setDay(i, { startTime: e.target.value })}
                disabled={!d.enabled}
                className="w-32"
              />
            </label>
            <label className="flex items-center gap-2 text-xs">
              <span className="text-ink/60">End</span>
              <Input
                type="time"
                min={envelopeOpen}
                max={envelopeClose}
                value={d.endTime}
                onChange={(e) => setDay(i, { endTime: e.target.value })}
                disabled={!d.enabled}
                className="w-32"
              />
            </label>
          </div>
        );
      })}

      {error && (
        <p role="alert" className="text-sm text-coral-dark">
          {error}
        </p>
      )}
      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save hours"}
        </Button>
      </div>
    </form>
  );
}

function toMin(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}
