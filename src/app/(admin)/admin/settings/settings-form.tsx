"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { SettingsDTO } from "@/backend";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";
import { updateSettingsAction } from "./actions";

interface Props {
  initial: SettingsDTO;
  smsEnabledByEnv: boolean;
  emailEnabledByEnv: boolean;
}

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function SettingsForm({ initial, smsEnabledByEnv, emailEnabledByEnv }: Props) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    businessName: initial.businessName,
    businessPhone: initial.businessPhone,
    businessAddress: initial.businessAddress,
    businessTimezone: initial.businessTimezone,
    defaultOpenTime: initial.defaultOpenTime,
    defaultCloseTime: initial.defaultCloseTime,
    defaultDaysOpen: initial.defaultDaysOpen,
    slotIntervalMin: initial.slotIntervalMin,
    bufferMin: initial.bufferMin,
    cancellationPolicy: initial.cancellationPolicy,
    smsNotificationsEnabled: initial.smsNotificationsEnabled,
    emailNotificationsEnabled: initial.emailNotificationsEnabled,
    intakeRequired: initial.intakeRequired,
    autoApproveWorkerTimeOff: initial.autoApproveWorkerTimeOff,
  });

  function toggleDay(day: number) {
    setForm((p) => ({
      ...p,
      defaultDaysOpen: p.defaultDaysOpen.includes(day)
        ? p.defaultDaysOpen.filter((d) => d !== day)
        : [...p.defaultDaysOpen, day].sort(),
    }));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const r = await updateSettingsAction(form);
      if (r.ok) {
        toast.success("Settings saved");
        router.refresh();
      } else {
        setError(r.error);
        toast.error(r.error);
      }
    });
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <Section title="Business info">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Business name" htmlFor="set-name">
            <Input
              id="set-name"
              value={form.businessName}
              onChange={(e) => setForm((p) => ({ ...p, businessName: e.target.value }))}
            />
          </Field>
          <Field label="Phone" htmlFor="set-phone">
            <Input
              id="set-phone"
              value={form.businessPhone}
              onChange={(e) => setForm((p) => ({ ...p, businessPhone: e.target.value }))}
            />
          </Field>
          <Field
            label="Address"
            htmlFor="set-addr"
            className="sm:col-span-2"
          >
            <Input
              id="set-addr"
              value={form.businessAddress}
              onChange={(e) => setForm((p) => ({ ...p, businessAddress: e.target.value }))}
            />
          </Field>
          <Field
            label="Timezone (IANA)"
            htmlFor="set-tz"
            hint="e.g. America/Los_Angeles"
          >
            <Input
              id="set-tz"
              value={form.businessTimezone}
              onChange={(e) => setForm((p) => ({ ...p, businessTimezone: e.target.value }))}
            />
          </Field>
        </div>
      </Section>

      <Section title="Hours & scheduling">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Default open" htmlFor="set-open" hint="HH:mm">
            <Input
              id="set-open"
              type="time"
              value={form.defaultOpenTime}
              onChange={(e) =>
                setForm((p) => ({ ...p, defaultOpenTime: e.target.value }))
              }
            />
          </Field>
          <Field label="Default close" htmlFor="set-close">
            <Input
              id="set-close"
              type="time"
              value={form.defaultCloseTime}
              onChange={(e) =>
                setForm((p) => ({ ...p, defaultCloseTime: e.target.value }))
              }
            />
          </Field>
          <Field label="Slot interval (min)" htmlFor="set-slot">
            <Input
              id="set-slot"
              type="number"
              min={5}
              max={120}
              value={form.slotIntervalMin}
              onChange={(e) =>
                setForm((p) => ({ ...p, slotIntervalMin: Number(e.target.value) }))
              }
            />
          </Field>
          <Field label="Buffer (min)" htmlFor="set-buffer">
            <Input
              id="set-buffer"
              type="number"
              min={0}
              max={120}
              value={form.bufferMin}
              onChange={(e) =>
                setForm((p) => ({ ...p, bufferMin: Number(e.target.value) }))
              }
            />
          </Field>
        </div>
        <div className="mt-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink/70">
            Default days open
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {DAY_LABELS.map((label, i) => {
              const checked = form.defaultDaysOpen.includes(i);
              return (
                <button
                  type="button"
                  key={label}
                  onClick={() => toggleDay(i)}
                  aria-pressed={checked}
                  className={
                    "rounded-lg px-3 py-1 text-sm ring-1 transition " +
                    (checked
                      ? "bg-coral text-cream ring-coral"
                      : "bg-cream text-ink/80 ring-coral/20 hover:ring-coral/40")
                  }
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </Section>

      <Section title="Notifications">
        <ToggleRow
          label="SMS confirmations & reminders"
          description={
            smsEnabledByEnv
              ? "Sent via Twilio when bookings change."
              : "Disabled by env flag SMS_ENABLED. Set SMS_ENABLED=true in your environment to enable this toggle."
          }
          disabled={!smsEnabledByEnv}
          checked={form.smsNotificationsEnabled && smsEnabledByEnv}
          onCheckedChange={(v) =>
            setForm((p) => ({ ...p, smsNotificationsEnabled: v }))
          }
        />
        <ToggleRow
          label="Email confirmations & reminders"
          description={
            emailEnabledByEnv
              ? "Sent via Resend when bookings change."
              : "Disabled by env flag EMAIL_ENABLED. Set EMAIL_ENABLED=true in your environment to enable this toggle."
          }
          disabled={!emailEnabledByEnv}
          checked={form.emailNotificationsEnabled && emailEnabledByEnv}
          onCheckedChange={(v) =>
            setForm((p) => ({ ...p, emailNotificationsEnabled: v }))
          }
        />
        <ToggleRow
          label="Require intake form"
          description="Prompt customers for a health intake form magic-link after booking."
          checked={form.intakeRequired}
          onCheckedChange={(v) => setForm((p) => ({ ...p, intakeRequired: v }))}
        />
        <ToggleRow
          label="Auto-approve worker time-off"
          description="Worker-submitted time-off requests are approved on submit (no admin review)."
          checked={form.autoApproveWorkerTimeOff}
          onCheckedChange={(v) =>
            setForm((p) => ({ ...p, autoApproveWorkerTimeOff: v }))
          }
        />
      </Section>

      <Section title="Cancellation policy">
        <Textarea
          value={form.cancellationPolicy}
          onChange={(e) =>
            setForm((p) => ({ ...p, cancellationPolicy: e.target.value }))
          }
          rows={4}
          maxLength={2000}
        />
      </Section>

      {error && (
        <p role="alert" className="text-sm text-coral-dark">
          {error}
        </p>
      )}
      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save settings"}
        </Button>
      </div>
    </form>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl bg-cream/80 p-5 ring-1 ring-coral/10">
      <h2 className="font-display text-xl text-coral-dark">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onCheckedChange,
  disabled,
}: {
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div
      className={
        "flex items-start justify-between gap-4 border-t border-coral/10 py-3 first:border-0 first:pt-0 " +
        (disabled ? "opacity-70" : "")
      }
    >
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-ink">{label}</p>
        <p className="mt-0.5 text-xs text-ink/60">{description}</p>
      </div>
      <Switch
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        ariaLabel={label}
      />
    </div>
  );
}
