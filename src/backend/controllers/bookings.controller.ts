import * as bookingsService from "../services/bookings.service";
import * as servicesService from "../services/services.service";
import * as therapistsService from "../services/therapists.service";
import { getSettings } from "../services/settings.service";
import { buildBookingIcs } from "../services/ics.service";
import { verifyToken as verifyTurnstileToken } from "../services/turnstile.service";
import { ForbiddenError } from "../types/errors";
import type { ControllerInput, RequestContext } from "../types";
import type { BookingDTO } from "../models/booking.model";
import type {
  CancelBookingInput,
  CreateBookingInput,
  GetBookingInput,
  ListBookingsInput,
  RescheduleBookingInput,
  UpdateTherapistNotesInput,
} from "../validation/bookings.schema";

export async function create({
  input,
  context,
}: ControllerInput<CreateBookingInput>): Promise<BookingDTO> {
  // Public bookings (no staff role) must pass Cloudflare Turnstile. Staff
  // bookings created through admin/worker portals skip the bot check.
  if (!context?.role) {
    await verifyTurnstileToken(input.turnstileToken, context?.ip);
  }
  return bookingsService.createBooking(input, {
    userId: context?.userId,
    role: context?.role,
  });
}

export async function get({
  input,
}: ControllerInput<GetBookingInput>): Promise<BookingDTO> {
  return bookingsService.getBooking(input);
}

export async function reschedule({
  input,
  context,
}: ControllerInput<RescheduleBookingInput>): Promise<BookingDTO> {
  // Either staff (admin) OR holder of the manage token can reschedule.
  if (!context?.role && !input.manageToken) {
    throw new ForbiddenError("Authentication required");
  }
  return bookingsService.rescheduleBooking(input, {
    userId: context?.userId,
    role: context?.role,
  });
}

export async function cancel({
  input,
  context,
}: ControllerInput<CancelBookingInput>): Promise<BookingDTO> {
  if (!context?.role && !input.manageToken) {
    throw new ForbiddenError("Authentication required");
  }
  return bookingsService.cancelBooking(input, {
    userId: context?.userId,
    role: context?.role,
  });
}

export async function markNoShow({
  input,
  context,
}: ControllerInput<{ id: string }>): Promise<BookingDTO> {
  requireStaff(context);
  return bookingsService.markNoShow(input, {
    userId: context?.userId,
    role: context?.role,
  });
}

export async function markCompleted({
  input,
  context,
}: ControllerInput<{ id: string }>): Promise<BookingDTO> {
  requireStaff(context);
  return bookingsService.markCompleted(input, {
    userId: context?.userId,
    role: context?.role,
  });
}

export async function list({
  input,
  context,
}: ControllerInput<ListBookingsInput | undefined>): Promise<BookingDTO[]> {
  // Workers see only their own.
  if (context?.role === "worker" && context.therapistId) {
    return bookingsService.listBookings({
      ...(input ?? { limit: 100 }),
      therapistId: context.therapistId,
    });
  }
  requireStaff(context);
  return bookingsService.listBookings(input ?? { limit: 100 });
}

export async function updateTherapistNotes({
  input,
  context,
}: ControllerInput<UpdateTherapistNotesInput>): Promise<BookingDTO> {
  requireStaff(context);
  return bookingsService.updateTherapistNotes(input, {
    userId: context?.userId,
    role: context?.role,
  });
}

function requireStaff(context: RequestContext | undefined): void {
  if (context?.role !== "admin" && context?.role !== "worker") {
    throw new ForbiddenError("Authentication required");
  }
}

/**
 * Returns an .ics calendar payload for a booking. Token-gated for the public
 * "Add to calendar" download - pass the booking's manageToken.
 */
export async function getICS({
  input,
}: ControllerInput<{ manageToken: string }>): Promise<{
  filename: string;
  body: string;
}> {
  const booking = await bookingsService.getBooking({
    manageToken: input.manageToken,
  });
  const [service, therapist, settings] = await Promise.all([
    servicesService.getService({ id: booking.serviceId }),
    therapistsService.getTherapist({ id: booking.therapistId }),
    getSettings(),
  ]);
  return buildBookingIcs({ booking, service, therapist, settings });
}
