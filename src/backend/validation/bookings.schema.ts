import { z } from "zod";
import {
  emailSchema,
  isoDateTimeSchema,
  objectIdSchema,
  phoneSchema,
} from "./common";

export const intakeFormDataSchema = z.object({
  pressurePreference: z.enum(["light", "medium", "firm", "deep"]).optional(),
  problemAreas: z.array(z.string().max(60)).max(20).optional(),
  allergies: z.string().max(500).optional(),
  medications: z.string().max(500).optional(),
  healthConditions: z.string().max(1000).optional(),
  pregnancyStatus: z
    .enum(["none", "first-trimester", "second-trimester", "third-trimester"])
    .optional(),
  recentInjuries: z.string().max(500).optional(),
  firstVisit: z.boolean().optional(),
});
export type IntakeFormDataInput = z.infer<typeof intakeFormDataSchema>;

export const createBookingSchema = z.object({
  therapistId: objectIdSchema,
  serviceId: objectIdSchema,
  startAt: isoDateTimeSchema,
  customerName: z.string().min(1).max(100),
  customerEmail: emailSchema,
  customerPhone: phoneSchema,
  notes: z.string().max(1000).optional(),
  /** Hold to consume; required for public bookings, optional for staff-created. */
  holdId: objectIdSchema.optional(),
  sessionId: z.string().min(1).max(120).optional(),
  /** Cloudflare Turnstile token; required for public bookings. */
  turnstileToken: z.string().optional(),
});
export type CreateBookingInput = z.infer<typeof createBookingSchema>;

export const rescheduleBookingSchema = z.object({
  id: objectIdSchema.optional(),
  /** Magic-link manage token (when customer reschedules without an account). */
  manageToken: z.string().optional(),
  newStartAt: isoDateTimeSchema,
}).refine((v) => v.id || v.manageToken, {
  message: "Either id or manageToken is required",
});
export type RescheduleBookingInput = z.infer<typeof rescheduleBookingSchema>;

export const cancelBookingSchema = z.object({
  id: objectIdSchema.optional(),
  manageToken: z.string().optional(),
  reason: z.string().max(500).optional(),
}).refine((v) => v.id || v.manageToken, {
  message: "Either id or manageToken is required",
});
export type CancelBookingInput = z.infer<typeof cancelBookingSchema>;

export const markStatusSchema = z.object({
  id: objectIdSchema,
});
export type MarkStatusInput = z.infer<typeof markStatusSchema>;

export const listBookingsSchema = z.object({
  therapistId: objectIdSchema.optional(),
  status: z
    .enum(["pending", "confirmed", "cancelled", "completed", "no_show"])
    .optional(),
  fromDate: isoDateTimeSchema.optional(),
  toDate: isoDateTimeSchema.optional(),
  customerName: z.string().max(100).optional(),
  limit: z.number().int().min(1).max(500).default(100),
});
export type ListBookingsInput = z.infer<typeof listBookingsSchema>;

export const getBookingSchema = z.object({
  id: objectIdSchema.optional(),
  manageToken: z.string().optional(),
}).refine((v) => v.id || v.manageToken, {
  message: "Either id or manageToken is required",
});
export type GetBookingInput = z.infer<typeof getBookingSchema>;

export const updateTherapistNotesSchema = z.object({
  id: objectIdSchema,
  notes: z.string().max(2000),
});
export type UpdateTherapistNotesInput = z.infer<typeof updateTherapistNotesSchema>;
