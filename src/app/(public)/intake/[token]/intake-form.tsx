"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";
import { submitIntake, type IntakeFormFields } from "./actions";

const PRESSURE_OPTIONS: Array<{
  value: "light" | "medium" | "firm" | "deep";
  label: string;
}> = [
  { value: "light", label: "Light" },
  { value: "medium", label: "Medium" },
  { value: "firm", label: "Firm" },
  { value: "deep", label: "Deep" },
];

const PREGNANCY_OPTIONS: Array<{
  value: "none" | "first-trimester" | "second-trimester" | "third-trimester";
  label: string;
}> = [
  { value: "none", label: "Not pregnant" },
  { value: "first-trimester", label: "First trimester" },
  { value: "second-trimester", label: "Second trimester" },
  { value: "third-trimester", label: "Third trimester" },
];

export function IntakeForm({
  token,
  alreadySubmitted,
}: {
  token: string;
  alreadySubmitted: boolean;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(alreadySubmitted);
  const [error, setError] = useState<string | null>(null);

  if (done) {
    return (
      <div
        role="status"
        className="rounded-2xl bg-blush/40 p-6 ring-1 ring-coral/20"
      >
        <h2 className="font-display text-xl text-coral-dark">
          Intake form received.
        </h2>
        <p className="mt-1 text-sm text-ink/80">
          Thank you - your therapist will review this before your visit.
        </p>
      </div>
    );
  }

  async function handleSubmit(formEl: HTMLFormElement) {
    const fd = new FormData(formEl);
    const problemAreas = fd
      .getAll("problemAreas")
      .map((v) => String(v))
      .filter(Boolean);

    const data: IntakeFormFields = {
      pressurePreference:
        (fd.get("pressurePreference") as IntakeFormFields["pressurePreference"]) ||
        undefined,
      problemAreas: problemAreas.length ? problemAreas : undefined,
      allergies: (fd.get("allergies") as string) || undefined,
      medications: (fd.get("medications") as string) || undefined,
      healthConditions: (fd.get("healthConditions") as string) || undefined,
      pregnancyStatus:
        (fd.get("pregnancyStatus") as IntakeFormFields["pregnancyStatus"]) ||
        undefined,
      recentInjuries: (fd.get("recentInjuries") as string) || undefined,
      firstVisit: fd.get("firstVisit") === "on",
    };

    setSubmitting(true);
    setError(null);
    const result = await submitIntake(token, data);
    setSubmitting(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setDone(true);
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void handleSubmit(e.currentTarget);
      }}
      className="space-y-6"
    >
      <fieldset className="space-y-3">
        <legend className="text-xs font-semibold uppercase tracking-wide text-ink/70">
          Pressure preference
        </legend>
        <div className="flex flex-wrap gap-2">
          {PRESSURE_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className="inline-flex items-center gap-2 rounded-full bg-cream px-3 py-1.5 text-sm ring-1 ring-coral/25 has-[:checked]:bg-blush has-[:checked]:ring-coral"
            >
              <input
                type="radio"
                name="pressurePreference"
                value={opt.value}
                className="h-4 w-4 accent-coral"
              />
              {opt.label}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="text-xs font-semibold uppercase tracking-wide text-ink/70">
          Problem areas (check all that apply)
        </legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {[
            "Neck",
            "Shoulders",
            "Upper back",
            "Lower back",
            "Hips",
            "Legs",
            "Feet",
            "Arms",
            "Headaches",
          ].map((area) => (
            <label
              key={area}
              className="inline-flex items-center gap-2 rounded-xl bg-cream px-3 py-2 text-sm ring-1 ring-coral/20 has-[:checked]:ring-coral"
            >
              <input
                type="checkbox"
                name="problemAreas"
                value={area}
                className="h-4 w-4 accent-coral"
              />
              {area}
            </label>
          ))}
        </div>
      </fieldset>

      <Field label="Allergies" htmlFor="allergies">
        <Textarea
          id="allergies"
          name="allergies"
          rows={2}
          placeholder="Oils, lotions, latex, etc."
        />
      </Field>

      <Field label="Current medications" htmlFor="medications">
        <Textarea
          id="medications"
          name="medications"
          rows={2}
          placeholder="Anything we should be aware of"
        />
      </Field>

      <Field
        label="Health conditions"
        htmlFor="healthConditions"
        hint="Heart conditions, diabetes, recent surgeries, etc."
      >
        <Textarea id="healthConditions" name="healthConditions" rows={3} />
      </Field>

      <Field label="Recent injuries" htmlFor="recentInjuries">
        <Textarea id="recentInjuries" name="recentInjuries" rows={2} />
      </Field>

      <fieldset className="space-y-2">
        <legend className="text-xs font-semibold uppercase tracking-wide text-ink/70">
          Pregnancy status
        </legend>
        <div className="flex flex-wrap gap-2">
          {PREGNANCY_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className="inline-flex items-center gap-2 rounded-full bg-cream px-3 py-1.5 text-sm ring-1 ring-coral/25 has-[:checked]:bg-blush has-[:checked]:ring-coral"
            >
              <input
                type="radio"
                name="pregnancyStatus"
                value={opt.value}
                className="h-4 w-4 accent-coral"
              />
              {opt.label}
            </label>
          ))}
        </div>
      </fieldset>

      <label className="inline-flex items-center gap-2 text-sm">
        <Input
          type="checkbox"
          name="firstVisit"
          className="h-4 w-4 accent-coral"
        />
        <span>This is my first visit</span>
      </label>

      <p className="text-xs text-ink/65">
        By submitting this form, you confirm the information above is accurate
        to the best of your knowledge. The submission is recorded with a
        timestamp as your digital signature.
      </p>

      {error ? (
        <p role="alert" className="text-sm text-coral-dark">
          {error}
        </p>
      ) : null}

      <Button type="submit" size="lg" disabled={submitting}>
        {submitting ? "Submitting…" : "Submit intake form"}
      </Button>
    </form>
  );
}
