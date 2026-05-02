"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { ServiceDTO, TherapistDTO } from "@/backend";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";
import {
  createServiceAction,
  updateServiceAction,
} from "@/app/(admin)/admin/services/actions";

interface Props {
  initial?: ServiceDTO;
  /** Therapists currently linked to this service (used to pre-check). */
  initialTherapistIds?: string[];
  therapists: TherapistDTO[];
  redirectTo?: string;
}

export function ServiceForm({
  initial,
  initialTherapistIds,
  therapists,
  redirectTo = "/admin/services",
}: Props) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [duration, setDuration] = useState(
    initial?.durationMin !== undefined ? String(initial.durationMin) : "60",
  );
  const [price, setPrice] = useState(
    initial?.price !== undefined ? String(initial.price) : "100",
  );
  const [active, setActive] = useState(initial?.active ?? true);
  const [therapistIds, setTherapistIds] = useState<string[]>(
    initialTherapistIds ?? [],
  );

  function toggleTherapist(id: string) {
    setTherapistIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) return setError("Name is required");
    const dur = Number(duration);
    if (!dur || dur < 5) return setError("Duration must be at least 5 minutes");
    const pr = Number(price);
    if (Number.isNaN(pr) || pr < 0) return setError("Price must be 0 or higher");

    const payload = {
      ...(initial ? { id: initial.id } : {}),
      name: name.trim(),
      description: description.trim() || undefined,
      durationMin: dur,
      price: pr,
      active,
      therapistIds,
    };
    startTransition(async () => {
      const r = initial
        ? await updateServiceAction(payload)
        : await createServiceAction(payload);
      if (r.ok) {
        toast.success(initial ? "Service updated" : "Service created");
        router.push(redirectTo);
        router.refresh();
      } else {
        setError(r.error);
        toast.error(r.error);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Field label="Name" htmlFor="s-name" required>
        <Input
          id="s-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          maxLength={100}
        />
      </Field>
      <Field label="Description" htmlFor="s-desc">
        <Textarea
          id="s-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={2000}
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Duration (min)" htmlFor="s-dur" required>
          <Input
            id="s-dur"
            type="number"
            min={5}
            max={480}
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            required
          />
        </Field>
        <Field label="Price (USD)" htmlFor="s-price" required>
          <Input
            id="s-price"
            type="number"
            min={0}
            step={1}
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            required
          />
        </Field>
      </div>

      <fieldset className="rounded-xl bg-cream/70 p-4 ring-1 ring-coral/10">
        <legend className="px-2 text-xs font-semibold uppercase tracking-wide text-ink/70">
          Therapists offering this service
        </legend>
        {therapists.length === 0 ? (
          <p className="text-sm text-ink/60">
            No therapists available. Add one first.
          </p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {therapists.map((t) => (
              <li key={t.id} className="flex items-center gap-2">
                <input
                  id={`tid-${t.id}`}
                  type="checkbox"
                  checked={therapistIds.includes(t.id)}
                  onChange={() => toggleTherapist(t.id)}
                  className="h-4 w-4 accent-coral"
                />
                <label htmlFor={`tid-${t.id}`} className="text-sm text-ink">
                  {t.name}
                  {!t.active && (
                    <span className="ml-1 text-xs text-ink/50">(inactive)</span>
                  )}
                </label>
              </li>
            ))}
          </ul>
        )}
      </fieldset>

      <div className="flex items-center justify-between rounded-xl bg-cream/70 px-4 py-3 ring-1 ring-coral/10">
        <div>
          <p className="text-sm font-semibold text-ink">Active</p>
          <p className="text-xs text-ink/60">
            Inactive services are hidden from the public booking flow.
          </p>
        </div>
        <Switch checked={active} onCheckedChange={setActive} ariaLabel="Active" />
      </div>
      {error && (
        <p role="alert" className="text-sm text-coral-dark">
          {error}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.push(redirectTo)}
          disabled={pending}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : initial ? "Save changes" : "Create service"}
        </Button>
      </div>
    </form>
  );
}
