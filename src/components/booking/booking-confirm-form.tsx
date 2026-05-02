"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";
import { formatInTimeZone } from "date-fns-tz";
import type { ServiceDTO, TherapistDTO } from "@/backend";
import { useHoldCountdown } from "@/hooks/use-hold-countdown";
import { useSessionId } from "@/hooks/use-session-id";
import { cn } from "@/lib/cn";
import { formatDuration, formatPrice } from "@/lib/format";

interface Props {
  therapist: TherapistDTO;
  service: ServiceDTO;
  startAt: string;
  cancellationPolicy: string;
  tz: string;
  turnstileSiteKey: string;
}

interface HoldState {
  id: string;
  expiresAt: string;
}

/**
 * Normalize a customer-entered phone string into E.164.
 *
 *   "555-123-4567"        → "+15551234567"  (default-country prepended)
 *   "1 (555) 123-4567"    → "+15551234567"
 *   "+44 20 7946 0958"    → "+442079460958"
 *
 * Returns null when the result doesn't look like a plausible E.164 number;
 * caller should surface a clear error instead of submitting.
 */
function normalizePhoneE164(raw: string, defaultCountry = "1"): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const digits = trimmed.replace(/\D/g, "");
  if (!digits) return null;
  let withCountry: string;
  if (trimmed.startsWith("+")) {
    withCountry = digits;
  } else if (digits.length === 10) {
    // Local number, no country code → assume default.
    withCountry = `${defaultCountry}${digits}`;
  } else if (digits.length === 11 && digits.startsWith(defaultCountry)) {
    withCountry = digits;
  } else {
    withCountry = digits;
  }
  if (withCountry.length < 8 || withCountry.length > 15) return null;
  if (withCountry.startsWith("0")) return null;
  return `+${withCountry}`;
}

export function BookingConfirmForm({
  therapist,
  service,
  startAt,
  cancellationPolicy,
  tz,
  turnstileSiteKey,
}: Props) {
  const router = useRouter();
  const sessionId = useSessionId();
  const [hold, setHold] = useState<HoldState | null>(null);
  const [holdError, setHoldError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string>("");
  const turnstileRef = useRef<TurnstileInstance | null>(null);

  // Cloudflare's "always passes (visible)" dev key. When this is the active
  // site key, any non-empty token validates against the matching test secret
  // server-side. If the widget script fails to load (e.g. when serving over
  // a Tailscale/LAN IP that Cloudflare's challenge endpoint can't reach in
  // some networks), auto-fill a dummy token after a short delay so dev users
  // aren't permanently stuck on "Please complete the bot-protection check."
  const isDevTurnstileKey = turnstileSiteKey === "1x00000000000000000000AA";
  useEffect(() => {
    if (!isDevTurnstileKey || turnstileToken) return;
    const t = setTimeout(() => {
      setTurnstileToken((cur) => cur || "dev-bypass");
    }, 3000);
    return () => clearTimeout(t);
  }, [isDevTurnstileKey, turnstileToken]);

  const countdown = useHoldCountdown(hold?.expiresAt ?? null);

  // ---- create hold on mount ----
  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch("/api/holds", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            therapistId: therapist.id,
            serviceId: service.id,
            startAt,
            sessionId,
          }),
        });
        const data = await r.json();
        if (cancelled) return;
        if (data.ok) {
          setHold({ id: data.data.id, expiresAt: data.data.expiresAt });
          setHoldError(null);
        } else {
          setHoldError(
            data.error?.message ??
              "Could not hold this slot. It may have just been booked.",
          );
        }
      } catch {
        if (!cancelled) {
          setHoldError("Network error placing slot hold. Please retry.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionId, therapist.id, service.id, startAt]);

  // ---- release hold on unmount (best effort) ----
  useEffect(() => {
    return () => {
      if (!hold || !sessionId) return;
      const url = `/api/holds/${hold.id}?sessionId=${encodeURIComponent(
        sessionId,
      )}`;
      // navigator.sendBeacon would be ideal, but DELETE isn't supported.
      // fetch with keepalive is widely supported in modern browsers.
      try {
        fetch(url, { method: "DELETE", keepalive: true }).catch(() => {});
      } catch {
        /* noop */
      }
    };
  }, [hold, sessionId]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;
    setSubmitError(null);
    if (countdown.expired) {
      setSubmitError("Your hold expired — please pick a new time.");
      return;
    }
    if (!turnstileToken) {
      setSubmitError("Please complete the bot-protection check.");
      return;
    }
    const form = new FormData(e.currentTarget);
    const rawPhone = String(form.get("customerPhone") ?? "");
    const phone = normalizePhoneE164(rawPhone);
    if (!phone) {
      setSubmitError(
        "Please enter a valid phone number, including country code (e.g. +15551234567).",
      );
      return;
    }
    setSubmitting(true);
    try {
      const r = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          therapistId: therapist.id,
          serviceId: service.id,
          startAt,
          customerName: String(form.get("customerName") ?? "").trim(),
          customerEmail: String(form.get("customerEmail") ?? "").trim(),
          customerPhone: phone,
          notes: String(form.get("notes") ?? "").trim() || undefined,
          holdId: hold?.id,
          sessionId: sessionId ?? undefined,
          turnstileToken,
        }),
      });
      const data = await r.json();
      if (!data.ok) {
        const code = data.error?.code as string | undefined;
        if (code === "CONFLICT") {
          setSubmitError(
            "Another customer just booked this slot. Please pick a new time.",
          );
        } else if (code === "VALIDATION_ERROR") {
          setSubmitError(
            data.error?.message ?? "Please double-check your details.",
          );
        } else if (code === "RATE_LIMITED") {
          setSubmitError("Too many requests. Please wait a moment and retry.");
        } else {
          setSubmitError(
            data.error?.message ?? "Something went wrong. Please retry.",
          );
        }
        // Reset Turnstile so the next submit gets a fresh token.
        turnstileRef.current?.reset();
        setTurnstileToken("");
        return;
      }
      // success — redirect to /book/success?token=…
      router.push(`/book/success?token=${data.data.manageToken}`);
    } catch {
      setSubmitError("Network error — please retry.");
    } finally {
      setSubmitting(false);
    }
  }

  const slotDisplay = `${formatInTimeZone(
    startAt,
    tz,
    "EEE, MMM d, yyyy",
  )} at ${formatInTimeZone(startAt, tz, "h:mm a")}`;

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_18rem]">
      <form className="space-y-6" onSubmit={handleSubmit} noValidate>
        <fieldset className="space-y-4">
          <legend className="font-display text-xl text-coral-dark">
            Your details
          </legend>
          <Field
            name="customerName"
            label="Full name"
            type="text"
            autoComplete="name"
            required
          />
          <Field
            name="customerEmail"
            label="Email"
            type="email"
            autoComplete="email"
            required
          />
          <Field
            name="customerPhone"
            label="Phone"
            type="tel"
            autoComplete="tel"
            required
            help="Format: +15551234567. We&rsquo;ll add +1 (US) automatically if you skip the country code."
          />
          <p className="text-xs text-ink/65">
            By providing your number, you agree to receive booking-related SMS.
            Reply <strong>STOP</strong> to opt out. Standard message rates may
            apply. See our{" "}
            <a className="underline-offset-4 hover:underline" href="/privacy">
              privacy policy
            </a>
            .
          </p>
          <label className="block">
            <span className="text-sm font-medium text-ink/85">
              Notes (optional)
            </span>
            <textarea
              name="notes"
              rows={3}
              maxLength={1000}
              className="mt-1 w-full rounded-xl border border-coral/20 bg-cream p-3 text-sm text-ink shadow-sm focus:border-coral focus:outline-none"
            />
          </label>
        </fieldset>

        <div>
          <Turnstile
            ref={turnstileRef}
            siteKey={turnstileSiteKey}
            onSuccess={setTurnstileToken}
            onExpire={() => setTurnstileToken("")}
            onError={() => setTurnstileToken("")}
          />
        </div>

        {submitError && (
          <p role="alert" className="text-sm text-coral-dark">
            {submitError}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting || !!holdError || countdown.expired}
          className={cn(
            "w-full rounded-full px-6 py-3 text-base font-semibold transition",
            !submitting && !holdError && !countdown.expired
              ? "bg-coral text-cream shadow-md hover:bg-coral-dark"
              : "cursor-not-allowed bg-blush/60 text-ink/50",
          )}
        >
          {submitting ? "Booking…" : "Confirm booking"}
        </button>
      </form>

      <aside className="order-first space-y-4 rounded-2xl bg-blush/40 p-5 ring-1 ring-coral/15 lg:order-last lg:sticky lg:top-24 lg:self-start">
        <h2 className="font-display text-xl text-coral-dark">Booking summary</h2>
        <dl className="space-y-1 text-sm text-ink/85">
          <div className="flex justify-between">
            <dt>Therapist</dt>
            <dd className="font-medium">{therapist.name}</dd>
          </div>
          <div className="flex justify-between">
            <dt>Service</dt>
            <dd className="font-medium">{service.name}</dd>
          </div>
          <div className="flex justify-between">
            <dt>Duration</dt>
            <dd className="font-medium">
              {formatDuration(service.durationMin)}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt>Price</dt>
            <dd className="font-medium">{formatPrice(service.price)}</dd>
          </div>
          <div className="mt-2">
            <dt className="text-xs uppercase tracking-wide text-ink/60">
              When
            </dt>
            <dd className="text-sm font-medium text-coral-dark">
              {slotDisplay}
            </dd>
          </div>
        </dl>

        {hold && !countdown.expired && (
          <p className="rounded-xl bg-cream/80 px-3 py-2 text-xs text-ink/75">
            Slot held for{" "}
            <span className="font-semibold text-coral-dark">
              {countdown.display}
            </span>
          </p>
        )}
        {countdown.expired && hold && (
          <p
            role="alert"
            className="rounded-xl bg-coral/15 px-3 py-2 text-xs text-coral-dark"
          >
            Your hold has expired. Please pick a new time.
          </p>
        )}
        {holdError && (
          <p
            role="alert"
            className="rounded-xl bg-coral/15 px-3 py-2 text-xs text-coral-dark"
          >
            {holdError}
          </p>
        )}

        <div className="border-t border-coral/15 pt-3">
          <h3 className="text-xs uppercase tracking-wide text-ink/60">
            Cancellation policy
          </h3>
          <p className="mt-1 text-xs text-ink/75 whitespace-pre-line">
            {cancellationPolicy}
          </p>
        </div>
      </aside>
    </div>
  );
}

interface FieldProps {
  name: string;
  label: string;
  type: string;
  autoComplete?: string;
  required?: boolean;
  help?: string;
}

function Field({ name, label, type, autoComplete, required, help }: FieldProps) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-ink/85">
        {label}
        {required && <span className="ml-0.5 text-coral-dark">*</span>}
      </span>
      <input
        type={type}
        name={name}
        autoComplete={autoComplete}
        required={required}
        className="mt-1 w-full rounded-xl border border-coral/20 bg-cream p-3 text-sm text-ink shadow-sm focus:border-coral focus:outline-none"
      />
      {help && <p className="mt-1 text-xs text-ink/60">{help}</p>}
    </label>
  );
}
