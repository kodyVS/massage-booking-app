import { z } from "zod";

/** A 24-character hex Mongo ObjectId. */
export const objectIdSchema = z
  .string()
  .regex(/^[a-f0-9]{24}$/i, "Invalid id");

/** "HH:mm" 24-hour time, e.g. "09:00", "17:30". */
export const hhmmSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Time must be HH:mm");

/** ISO 8601 date-time string. Accepts trailing Z or offset. */
export const isoDateTimeSchema = z
  .string()
  .datetime({ offset: true });

/** YYYY-MM-DD calendar date. */
export const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD");

/**
 * Phone validation. Accepts either:
 *   - strict E.164 (`+15551234567`) — preferred, what the SMS service requires
 *   - or a loose 7–20 char fallback so an admin entering a booking on behalf
 *     of a customer with a partial number isn't blocked. The SMS service
 *     re-validates strictly before dispatching, so non-E.164 numbers
 *     short-circuit at send time without ever reaching Twilio.
 *
 * The public booking form normalizes user input into E.164 client-side
 * before submitting (see `normalizePhoneE164` in
 * `src/components/booking/booking-confirm-form.tsx`).
 */
export const phoneSchema = z
  .string()
  .min(7, "Phone too short")
  .max(20, "Phone too long")
  .refine(
    (v) => /^\+?[0-9 \-().]{7,20}$/.test(v),
    "Phone may only contain digits, spaces, +, -, ., (, ).",
  );

export const emailSchema = z.string().email().toLowerCase();
