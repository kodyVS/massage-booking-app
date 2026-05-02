/**
 * Email service - thin Resend wrapper with the dual-toggle gate from
 * `TEAM_PROMPT.md`:
 *
 *   process.env.EMAIL_ENABLED === "true"  AND  settings.emailNotificationsEnabled
 *
 * Both must be true to send. Either being false is a clean no-op + log.
 *
 * Errors from Resend are caught and logged - booking creation must never
 * fail because the email provider blew up.
 *
 * Templates live under `src/emails/` (presentational, brand-styled HTML
 * strings). The dependency direction is: email.service imports templates,
 * templates import nothing from outside `src/emails/`. ESLint enforces.
 */
import { formatInTimeZone } from "date-fns-tz";
import { Resend } from "resend";
import {
  renderBookingCancellation,
  type BookingCancellationInput,
} from "../../emails/booking-cancellation";
import {
  renderBookingConfirmation,
  type BookingConfirmationInput,
} from "../../emails/booking-confirmation";
import {
  renderBookingReminder,
  type BookingReminderInput,
} from "../../emails/booking-reminder";
import {
  renderBookingReschedule,
  type BookingRescheduleInput,
} from "../../emails/booking-reschedule";
import type { BookingDTO } from "../models/booking.model";
import type { ServiceDTO } from "../models/service.model";
import type { SettingsDTO } from "../models/settings.model";
import type { TherapistDTO } from "../models/therapist.model";
import { buildBookingIcs } from "./ics.service";
import { generateIntakeToken } from "./tokens.service";

interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  ics?: { filename: string; content: string };
}

interface SendContext {
  booking: BookingDTO;
  service: ServiceDTO;
  therapist: TherapistDTO;
  settings: SettingsDTO;
}

let cachedClient: Resend | null = null;
function getClient(): Resend | null {
  if (cachedClient) return cachedClient;
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  cachedClient = new Resend(key);
  return cachedClient;
}

function envEnabled(): boolean {
  return process.env.EMAIL_ENABLED === "true";
}

function fromAddr(): string {
  return (
    process.env.RESEND_FROM_EMAIL ||
    "Vital Touch Massage <onboarding@resend.dev>"
  );
}

/**
 * Generic send helper. Returns `{ sent }` so callers can log; never throws.
 * The dual-toggle (env + settings) is enforced here so every helper below
 * inherits it.
 */
export async function sendEmail(
  input: SendEmailInput,
  settings: SettingsDTO,
): Promise<{ sent: boolean; reason?: string }> {
  if (!envEnabled()) {
    console.info("[email] skipped - EMAIL_ENABLED is not 'true'");
    return { sent: false, reason: "env-disabled" };
  }
  if (!settings.emailNotificationsEnabled) {
    console.info(
      "[email] skipped - settings.emailNotificationsEnabled is false",
    );
    return { sent: false, reason: "settings-disabled" };
  }
  if (!input.to || !input.to.includes("@")) {
    console.warn(`[email] skipped - invalid recipient "${input.to}"`);
    return { sent: false, reason: "invalid-recipient" };
  }
  const client = getClient();
  if (!client) {
    console.warn("[email] skipped - RESEND_API_KEY not configured");
    return { sent: false, reason: "no-api-key" };
  }
  try {
    const attachments = input.ics
      ? [
          {
            filename: input.ics.filename,
            content: input.ics.content,
            contentType: "text/calendar",
          },
        ]
      : undefined;
    await client.emails.send({
      from: fromAddr(),
      to: input.to,
      subject: input.subject,
      html: input.html,
      attachments,
    });
    return { sent: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[email] failed to send to ${input.to}: ${msg}`);
    return { sent: false, reason: "resend-error" };
  }
}

function appBaseUrl(): string {
  return (
    process.env.NEXTAUTH_URL?.replace(/\/$/, "") || "http://localhost:3000"
  );
}

function manageUrl(token: string): string {
  return `${appBaseUrl()}/manage/${encodeURIComponent(token)}`;
}

function bookingUrl(): string {
  return `${appBaseUrl()}/book`;
}

function intakeUrlFor(bookingId: string): string {
  const token = generateIntakeToken(bookingId);
  return `${appBaseUrl()}/intake/${encodeURIComponent(token)}`;
}

function buildFacts(ctx: SendContext): {
  customerFirstName: string;
  serviceName: string;
  therapistName: string;
  whenLong: string;
  durationLabel: string;
  priceLabel: string;
  businessName: string;
  businessAddress?: string;
  businessPhone?: string;
  cancellationPolicy: string;
} {
  const { booking, service, therapist, settings } = ctx;
  const tz = settings.businessTimezone;
  const whenLong = formatInTimeZone(
    new Date(booking.startAt),
    tz,
    "EEEE, MMM d, yyyy 'at' h:mm a zzz",
  );
  const duration =
    service.durationMin >= 60 && service.durationMin % 60 === 0
      ? `${service.durationMin / 60} hr`
      : `${service.durationMin} min`;
  const price = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: service.price % 1 === 0 ? 0 : 2,
  }).format(service.price);
  return {
    customerFirstName: booking.customerName.split(/\s+/)[0],
    serviceName: service.name,
    therapistName: therapist.name,
    whenLong,
    durationLabel: duration,
    priceLabel: price,
    businessName: settings.businessName,
    businessAddress: settings.businessAddress || undefined,
    businessPhone: settings.businessPhone || undefined,
    cancellationPolicy: settings.cancellationPolicy,
  };
}

function buildIcsAttachment(ctx: SendContext) {
  try {
    const { filename, body } = buildBookingIcs(ctx);
    return { filename, content: body };
  } catch (err) {
    console.warn("[email] could not generate ICS attachment", err);
    return undefined;
  }
}

export async function sendBookingConfirmation(ctx: SendContext): Promise<void> {
  const facts = buildFacts(ctx);
  const input: BookingConfirmationInput = {
    ...facts,
    manageUrl: manageUrl(ctx.booking.manageToken),
    intakeUrl: ctx.settings.intakeRequired
      ? intakeUrlFor(ctx.booking.id)
      : undefined,
  };
  const { subject, html } = renderBookingConfirmation(input);
  await sendEmail(
    {
      to: ctx.booking.customerEmail,
      subject,
      html,
      ics: buildIcsAttachment(ctx),
    },
    ctx.settings,
  );
}

export async function sendReminder(ctx: SendContext): Promise<void> {
  const facts = buildFacts(ctx);
  const input: BookingReminderInput = {
    ...facts,
    manageUrl: manageUrl(ctx.booking.manageToken),
  };
  const { subject, html } = renderBookingReminder(input);
  await sendEmail(
    { to: ctx.booking.customerEmail, subject, html },
    ctx.settings,
  );
}

export async function sendCancellation(ctx: SendContext): Promise<void> {
  const facts = buildFacts(ctx);
  const input: BookingCancellationInput = {
    ...facts,
    bookingUrl: bookingUrl(),
  };
  const { subject, html } = renderBookingCancellation(input);
  await sendEmail(
    { to: ctx.booking.customerEmail, subject, html },
    ctx.settings,
  );
}

export async function sendReschedule(
  ctx: SendContext,
  previousStartIso?: string,
): Promise<void> {
  const facts = buildFacts(ctx);
  const previousWhenLong = previousStartIso
    ? formatInTimeZone(
        new Date(previousStartIso),
        ctx.settings.businessTimezone,
        "EEEE, MMM d, yyyy 'at' h:mm a zzz",
      )
    : undefined;
  const input: BookingRescheduleInput = {
    ...facts,
    manageUrl: manageUrl(ctx.booking.manageToken),
    previousWhenLong,
  };
  const { subject, html } = renderBookingReschedule(input);
  await sendEmail(
    {
      to: ctx.booking.customerEmail,
      subject,
      html,
      ics: buildIcsAttachment(ctx),
    },
    ctx.settings,
  );
}
