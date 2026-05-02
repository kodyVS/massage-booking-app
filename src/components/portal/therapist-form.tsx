"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { TherapistDTO } from "@/backend";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";
import {
  createTherapistAction,
  updateTherapistAction,
} from "@/app/(admin)/admin/therapists/actions";

interface Props {
  initial?: TherapistDTO;
  /** Where to navigate after success. */
  redirectTo?: string;
}

interface FormState {
  name: string;
  photoUrl: string;
  bio: string;
  specialties: string;
  licenseNumber: string;
  yearsExperience: string;
  active: boolean;
}

export function TherapistForm({ initial, redirectTo = "/admin/therapists" }: Props) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>({
    name: initial?.name ?? "",
    photoUrl: initial?.photoUrl ?? "",
    bio: initial?.bio ?? "",
    specialties: initial?.specialties.join(", ") ?? "",
    licenseNumber: initial?.licenseNumber ?? "",
    yearsExperience:
      initial?.yearsExperience !== undefined ? String(initial.yearsExperience) : "",
    active: initial?.active ?? true,
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.name.trim()) {
      setError("Name is required");
      return;
    }
    const payload = {
      ...(initial ? { id: initial.id } : {}),
      name: form.name.trim(),
      photoUrl: form.photoUrl.trim() || undefined,
      bio: form.bio.trim() || undefined,
      specialties: form.specialties
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      licenseNumber: form.licenseNumber.trim() || undefined,
      yearsExperience: form.yearsExperience
        ? Number(form.yearsExperience)
        : undefined,
      active: form.active,
    };

    startTransition(async () => {
      const result = initial
        ? await updateTherapistAction(payload)
        : await createTherapistAction(payload);
      if (result.ok) {
        toast.success(initial ? "Therapist updated" : "Therapist created");
        router.push(redirectTo);
        router.refresh();
      } else {
        setError(result.error);
        toast.error(result.error);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Field label="Name" htmlFor="t-name" required>
        <Input
          id="t-name"
          value={form.name}
          onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
          required
          maxLength={100}
        />
      </Field>
      <Field label="Photo URL" htmlFor="t-photo" hint="Paste an https:// image URL.">
        <Input
          id="t-photo"
          type="url"
          value={form.photoUrl}
          onChange={(e) => setForm((p) => ({ ...p, photoUrl: e.target.value }))}
          placeholder="https://…"
        />
      </Field>
      <Field label="Bio" htmlFor="t-bio">
        <Textarea
          id="t-bio"
          value={form.bio}
          onChange={(e) => setForm((p) => ({ ...p, bio: e.target.value }))}
          maxLength={2000}
        />
      </Field>
      <Field label="Specialties" htmlFor="t-spec" hint="Comma-separated.">
        <Input
          id="t-spec"
          value={form.specialties}
          onChange={(e) =>
            setForm((p) => ({ ...p, specialties: e.target.value }))
          }
          placeholder="Deep tissue, Swedish, Sports"
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="License #" htmlFor="t-lic">
          <Input
            id="t-lic"
            value={form.licenseNumber}
            onChange={(e) =>
              setForm((p) => ({ ...p, licenseNumber: e.target.value }))
            }
          />
        </Field>
        <Field label="Years experience" htmlFor="t-yrs">
          <Input
            id="t-yrs"
            type="number"
            min={0}
            max={80}
            value={form.yearsExperience}
            onChange={(e) =>
              setForm((p) => ({ ...p, yearsExperience: e.target.value }))
            }
          />
        </Field>
      </div>
      <div className="flex items-center justify-between rounded-xl bg-cream/70 px-4 py-3 ring-1 ring-coral/10">
        <div>
          <p className="text-sm font-semibold text-ink">Active</p>
          <p className="text-xs text-ink/60">Inactive therapists can&apos;t take new bookings.</p>
        </div>
        <Switch
          checked={form.active}
          onCheckedChange={(v) => setForm((p) => ({ ...p, active: v }))}
          ariaLabel="Active"
        />
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
          {pending ? "Saving…" : initial ? "Save changes" : "Create therapist"}
        </Button>
      </div>
    </form>
  );
}
