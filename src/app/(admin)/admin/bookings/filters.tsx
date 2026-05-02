"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import type { ListBookingsInput, TherapistDTO } from "@/backend";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

interface Props {
  therapists: TherapistDTO[];
  initial: ListBookingsInput;
}

const STATUSES: ListBookingsInput["status"][] = [
  undefined as unknown as ListBookingsInput["status"],
  "pending",
  "confirmed",
  "completed",
  "no_show",
  "cancelled",
];

export function BookingsFilters({ therapists, initial }: Props) {
  const router = useRouter();
  const params = useSearchParams();
  const [therapistId, setTherapistId] = useState(initial.therapistId ?? "");
  const [status, setStatus] = useState(initial.status ?? "");
  const [q, setQ] = useState(params.get("q") ?? "");
  const [from, setFrom] = useState(params.get("from") ?? "");
  const [to, setTo] = useState(params.get("to") ?? "");

  function apply(e: React.FormEvent) {
    e.preventDefault();
    const sp = new URLSearchParams();
    if (therapistId) sp.set("therapistId", therapistId);
    if (status) sp.set("status", status);
    if (q) sp.set("q", q);
    if (from) sp.set("from", from);
    if (to) sp.set("to", to);
    router.push(`/admin/bookings?${sp.toString()}`);
  }

  function clearAll() {
    setTherapistId("");
    setStatus("");
    setQ("");
    setFrom("");
    setTo("");
    router.push("/admin/bookings");
  }

  return (
    <form
      onSubmit={apply}
      className="grid gap-3 rounded-2xl bg-cream/80 p-4 ring-1 ring-coral/10 sm:grid-cols-2 lg:grid-cols-6"
    >
      <label className="text-xs">
        <span className="block text-ink/60">From</span>
        <Input
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          className="mt-1"
        />
      </label>
      <label className="text-xs">
        <span className="block text-ink/60">To</span>
        <Input
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className="mt-1"
        />
      </label>
      <label className="text-xs">
        <span className="block text-ink/60">Therapist</span>
        <Select
          value={therapistId}
          onChange={(e) => setTherapistId(e.target.value)}
          className="mt-1"
        >
          <option value="">All</option>
          {therapists.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </Select>
      </label>
      <label className="text-xs">
        <span className="block text-ink/60">Status</span>
        <Select
          value={status ?? ""}
          onChange={(e) => setStatus(e.target.value as typeof status)}
          className="mt-1"
        >
          {STATUSES.map((s) => (
            <option key={s ?? "all"} value={s ?? ""}>
              {s ?? "All"}
            </option>
          ))}
        </Select>
      </label>
      <label className="text-xs sm:col-span-2 lg:col-span-1">
        <span className="block text-ink/60">Customer name</span>
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search…"
          className="mt-1"
        />
      </label>
      <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-1">
        <Button type="submit" size="md">
          Apply
        </Button>
        <Button type="button" size="md" variant="ghost" onClick={clearAll}>
          Clear
        </Button>
      </div>
    </form>
  );
}
