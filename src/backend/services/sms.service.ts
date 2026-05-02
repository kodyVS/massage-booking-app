/**
 * SMS service - thin Twilio wrapper with the dual-toggle gate from
 * `TEAM_PROMPT.md`:
 *
 *   process.env.SMS_ENABLED === "true"  AND  settings.smsNotificationsEnabled
 *
 * Both must be true to send. Either being false is a clean no-op + log.
 *
 * Errors from Twilio are caught and logged - booking create / cancel /
 * reschedule must never fail because the SMS provider blew up.
 */
import { formatInTimeZone } from "date-fns-tz";
import twilio from "twilio";
import type { BookingDTO } from "../models/booking.model";
import type { ServiceDTO } from "../models/service.model";
import type { SettingsDTO } from "../models/settings.model";
import type { TherapistDTO } from "../models/therapist.model";

interface SendContext {
  booking: BookingDTO;
  service: ServiceDTO;
  therapist: TherapistDTO;
  settings: SettingsDTO;
}

/** RFC-3966-friendly E.164: leading '+' followed by 8–15 digits. */
const E164 = /^\+[1-9]\d{7,14}$/;

let cachedClient: ReturnType<typeof twilio> | null = null;
function getClient(): ReturnType<typeof twilio> | null {
  if (cachedClient) return cachedClient;
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) return null;
  cachedClient = twilio(sid, token);
  return cachedClient;
}

function envEnabled(): boolean {
  return process.env.SMS_ENABLED === "true";
}

function fromNumber(): string | null {
  return process.env.TWILIO_FROM_NUMBER || null;
}

/**
 * Low-level send. Returns `{ sent: boolean }` so callers can log the outcome
 * (typically only useful in tests + the reminders cron count). Never throws.
 */
export async function sendSms(
  to: string,
  body: string,
  settings: SettingsDTO,
): Promise<{ sent: boolean; reason?: string }> {
  if (!envEnabled()) {
    console.info("[sms] skipped - SMS_ENABLED is not 'true'");
    return { sent: false, reason: "env-disabled" };
  }
  if (!settings.smsNotificationsEnabled) {
    console.info("[sms] skipped - settings.smsNotificationsEnabled is false");
    return { sent: false, reason: "settings-disabled" };
  }
  if (!E164.test(to)) {
    console.warn(`[sms] skipped - invalid E.164 number "${to}"`);
    return { sent: false, reason: "invalid-number" };
  }
  const from = fromNumber();
  if (!from) {
    console.warn("[sms] skipped - TWILIO_FROM_NUMBER is not set");
    return { sent: false, reason: "no-from-number" };
  }
  const client = getClient();
  if (!client) {
    console.warn("[sms] skipped - Twilio credentials not configured");
    return { sent: false, reason: "no-credentials" };
  }
  try {
    await client.messages.create({ to, from, body });
    return { sent: true };
  } catch (err) {
    // Twilio throws a `RestException` with `code` / `status`. We log and
    // swallow so the parent operation (booking write) is never blocked.
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[sms] failed to send to ${to}: ${msg}`);
    return { sent: false, reason: "twilio-error" };
  }
}

function formatWhen(iso: string, tz: string): string {
  return formatInTimeZone(new Date(iso), tz, "EEE, MMM d 'at' h:mm a");
}

function trailer(settings: SettingsDTO): string {
  return `${settings.businessName}. Reply STOP to opt out.`;
}

export async function sendBookingConfirmation(ctx: SendContext): Promise<void> {
  const { booking, service, therapist, settings } = ctx;
  const when = formatWhen(booking.startAt, settings.businessTimezone);
  const body = [
    `Hi ${booking.customerName.split(/\s+/)[0]}, your ${service.name} with ${therapist.name} is confirmed for ${when}.`,
    settings.businessAddress ? `Location: ${settings.businessAddress}.` : null,
    trailer(settings),
  ]
    .filter(Boolean)
    .join(" ");
  await sendSms(booking.customerPhone, body, settings);
}

export async function sendReminder(ctx: SendContext): Promise<void> {
  const { booking, service, therapist, settings } = ctx;
  const when = formatWhen(booking.startAt, settings.businessTimezone);
  const body = [
    `Reminder: ${service.name} with ${therapist.name} ${when}.`,
    settings.businessAddress ? `${settings.businessAddress}.` : null,
    trailer(settings),
  ]
    .filter(Boolean)
    .join(" ");
  await sendSms(booking.customerPhone, body, settings);
}

export async function sendCancellation(ctx: SendContext): Promise<void> {
  const { booking, service, therapist, settings } = ctx;
  const when = formatWhen(booking.startAt, settings.businessTimezone);
  const body = [
    `Your ${service.name} with ${therapist.name} on ${when} has been cancelled.`,
    settings.businessPhone
      ? `Questions? Call ${settings.businessPhone}.`
      : null,
    trailer(settings),
  ]
    .filter(Boolean)
    .join(" ");
  await sendSms(booking.customerPhone, body, settings);
}

export async function sendReschedule(ctx: SendContext): Promise<void> {
  const { booking, service, therapist, settings } = ctx;
  const when = formatWhen(booking.startAt, settings.businessTimezone);
  const body = [
    `Your ${service.name} with ${therapist.name} has been rescheduled to ${when}.`,
    trailer(settings),
  ].join(" ");
  await sendSms(booking.customerPhone, body, settings);
}
