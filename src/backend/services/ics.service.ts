import { createEvent } from "ics";
import type { BookingDTO } from "../models/booking.model";
import type { ServiceDTO } from "../models/service.model";
import type { TherapistDTO } from "../models/therapist.model";
import type { SettingsDTO } from "../models/settings.model";

interface BuildIcsInput {
  booking: BookingDTO;
  service: ServiceDTO;
  therapist: TherapistDTO;
  settings: SettingsDTO;
}

/**
 * Build an .ics calendar payload for a confirmed booking. Returned tuple is
 * `{ filename, body }` where `body` is the raw ICS text.
 *
 * The `ics` package validates input strictly - we feed it UTC date components
 * extracted from the booking's `startAt` ISO string.
 */
export function buildBookingIcs({
  booking,
  service,
  therapist,
  settings,
}: BuildIcsInput): { filename: string; body: string } {
  const start = new Date(booking.startAt);
  const end = new Date(booking.endAt);

  const startArr: [number, number, number, number, number] = [
    start.getUTCFullYear(),
    start.getUTCMonth() + 1,
    start.getUTCDate(),
    start.getUTCHours(),
    start.getUTCMinutes(),
  ];
  const endArr: [number, number, number, number, number] = [
    end.getUTCFullYear(),
    end.getUTCMonth() + 1,
    end.getUTCDate(),
    end.getUTCHours(),
    end.getUTCMinutes(),
  ];

  const summary = `${service.name} with ${therapist.name}`;
  const description = [
    `Booking with ${therapist.name}`,
    `Service: ${service.name} (${service.durationMin} min)`,
    settings.businessAddress ? `Location: ${settings.businessAddress}` : null,
    settings.businessPhone ? `Phone: ${settings.businessPhone}` : null,
    booking.notes ? `Notes: ${booking.notes}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const { error, value } = createEvent({
    title: summary,
    description,
    start: startArr,
    startInputType: "utc",
    end: endArr,
    endInputType: "utc",
    location: settings.businessAddress || settings.businessName,
    organizer: {
      name: settings.businessName,
      email: process.env.RESEND_FROM_EMAIL || "noreply@example.com",
    },
    uid: `booking-${booking.id}@${settings.businessName.toLowerCase().replace(/\s+/g, "")}`,
    productId: settings.businessName,
    status: booking.status === "cancelled" ? "CANCELLED" : "CONFIRMED",
  });

  if (error || !value) {
    throw new Error(`Failed to generate ICS: ${error?.message ?? "unknown"}`);
  }

  const filename = `booking-${booking.id}.ics`;
  return { filename, body: value };
}
