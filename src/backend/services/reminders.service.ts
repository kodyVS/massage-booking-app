/**
 * Reminders service. Find bookings ~24h out that haven't been reminded yet
 * and fire SMS + email. Idempotent: stamps `reminderSentAt` so a second run
 * inside the same window is a no-op.
 *
 * Vercel Cron hits `/api/cron/reminders` every 15 min. Each fire scans the
 * 23.5–24.5h window — that 60-minute span overlaps with the next 4 cron
 * fires, so we always have multiple chances to catch a booking before it
 * leaves the window. We only send once per booking (the `reminderSentAt`
 * stamp + the query filter together guarantee that).
 */
import { connectDB } from "../db/connection";
import {
  BookingModel,
  bookingToDTO,
  type BookingDTO,
} from "../models/booking.model";
import { ServiceModel, serviceToDTO } from "../models/service.model";
import { TherapistModel, therapistToDTO } from "../models/therapist.model";
import * as emailService from "./email.service";
import { getSettings } from "./settings.service";
import * as smsService from "./sms.service";

export interface RemindersResult {
  scanned: number;
  sent: number;
  skipped: number;
}

/**
 * Send reminders for any confirmed booking starting in the 23.5–24.5h
 * window with `reminderSentAt` not set yet. Stamps `reminderSentAt` after
 * dispatch attempt so it never double-sends, even if either provider
 * returned a non-fatal error (we don't retry — the customer would receive
 * a duplicate next cron tick otherwise).
 */
export async function sendDueReminders(
  now: Date = new Date(),
): Promise<RemindersResult> {
  await connectDB();

  const HALF_HOUR = 30 * 60_000;
  const windowStart = new Date(now.getTime() + 24 * 60 * 60_000 - HALF_HOUR);
  const windowEnd = new Date(now.getTime() + 24 * 60 * 60_000 + HALF_HOUR);

  const due = await BookingModel.find({
    status: "confirmed",
    reminderSentAt: { $in: [null, undefined] },
    startAt: { $gte: windowStart, $lte: windowEnd },
  }).exec();

  const settings = await getSettings();
  let sent = 0;
  let skipped = 0;

  for (const booking of due) {
    // Stamp BEFORE sending so concurrent cron runs (rare but possible) won't
    // double-send. If sending fails, the booking is still marked — we accept
    // a missed reminder over a duplicate.
    booking.reminderSentAt = new Date();
    await booking.save();

    const [service, therapist] = await Promise.all([
      ServiceModel.findById(booking.serviceId).exec(),
      TherapistModel.findById(booking.therapistId).exec(),
    ]);
    if (!service || !therapist) {
      skipped += 1;
      continue;
    }

    const dto: BookingDTO = bookingToDTO(booking);
    const ctx = {
      booking: dto,
      service: serviceToDTO(service),
      therapist: therapistToDTO(therapist),
      settings,
    };
    try {
      await smsService.sendReminder(ctx);
      await emailService.sendReminder(ctx);
      sent += 1;
    } catch (err) {
      // The integration services already swallow their own errors, but we
      // still defend against unexpected throws so one bad booking doesn't
      // stop the whole batch.
      console.error("[reminders] send failed for booking", booking.id, err);
      skipped += 1;
    }
  }

  return { scanned: due.length, sent, skipped };
}
