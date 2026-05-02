/**
 * Public types exposed by the backend module.
 *
 * DTOs (the plain JSON-friendly shapes that services and controllers return)
 * live alongside their model in `src/backend/models/<entity>.model.ts`.
 * Re-exporting them here gives the frontend a single import point:
 *
 *   import type { BookingDTO, TherapistDTO } from "@/backend";
 */

export type {
  BookingDTO,
  IIntakeFormData,
} from "../models/booking.model";
export type { BookingHoldDTO } from "../models/bookingHold.model";
export type { CustomerNoteDTO } from "../models/customerNote.model";
export type {
  CustomerDetailDTO,
  CustomerSummaryDTO,
} from "../services/customers.service";
export type { ServiceDTO } from "../models/service.model";
export type { SettingsDTO } from "../models/settings.model";
export type { TherapistDTO } from "../models/therapist.model";
export type { TherapistServiceDTO } from "../models/therapistService.model";
export type { TimeOffDTO } from "../models/timeOff.model";
export type { UserDTO } from "../models/user.model";
export type { WorkingHoursDTO } from "../models/workingHours.model";
export type { AuditLogDTO } from "../models/auditLog.model";

// Selected validation input types that the frontend needs for filter forms.
export type { ListBookingsInput } from "../validation/bookings.schema";

/**
 * Per-request authentication context passed to controllers.
 *
 * Built by the route/server-action layer from the NextAuth session
 * (or from a magic-link token for public manage flows). Controllers
 * use it to gate operations and to record audit-log actor info.
 */
export interface RequestContext {
  userId?: string;
  role?: "admin" | "worker";
  /** Set when the request is authenticated by a magic-link manage token. */
  bookingToken?: string;
  /** When the worker context is for a specific therapist (their own). */
  therapistId?: string;
  /** Client IP, when available - used for rate limiting / Turnstile. */
  ip?: string;
}

/**
 * Standard input envelope for controller methods.
 *
 *   controller.someMethod({ input: parsedBody, context: ctx })
 */
export interface ControllerInput<TInput> {
  input: TInput;
  context?: RequestContext;
}

/**
 * Slot returned by the availability service. `startAt`/`endAt` are ISO
 * strings (UTC). Frontend formats in the business timezone.
 */
export interface AvailableSlotDTO {
  therapistId: string;
  startAt: string;
  endAt: string;
}

/**
 * One bookable start time aggregated across every therapist who can perform
 * the service on that day. `therapistIds` is the set of therapists who have
 * an open slot starting at exactly `startAt` for `endAt - startAt` of work.
 *
 * Used by the service-first booking flow (`/book/service/[serviceId]`),
 * where the user picks a slot first and then chooses any of the listed
 * therapists.
 */
export interface ServiceSlotDTO {
  startAt: string;
  endAt: string;
  therapistIds: string[];
}
