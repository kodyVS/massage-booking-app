import crypto from "node:crypto";
import { Types } from "mongoose";
import { connectDB } from "../db/connection";
import {
  BookingModel,
  bookingToDTO,
  type BookingDTO,
} from "../models/booking.model";
import { ServiceModel, serviceToDTO } from "../models/service.model";
import { TherapistModel, therapistToDTO } from "../models/therapist.model";
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from "../types/errors";
import {
  cancelBookingSchema,
  createBookingSchema,
  getBookingSchema,
  listBookingsSchema,
  rescheduleBookingSchema,
  updateTherapistNotesSchema,
  type CancelBookingInput,
  type CreateBookingInput,
  type GetBookingInput,
  type ListBookingsInput,
  type RescheduleBookingInput,
  type UpdateTherapistNotesInput,
} from "../validation/bookings.schema";
import { record as recordAudit } from "./audit.service";
import * as emailService from "./email.service";
import { consumeHold, verifyHold } from "./holds.service";
import { getSettings } from "./settings.service";
import * as smsService from "./sms.service";
import { generateManageToken } from "./tokens.service";

/**
 * Helper that runs an integration side-effect (SMS, email) and never lets it
 * fail the parent operation. The integration services already swallow their
 * own errors, but this is belt-and-suspenders against an unexpected throw
 * (e.g. a TypeError before we even reach the provider client).
 */
async function safe(label: string, fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
  } catch (err) {
    console.error(`[bookings] ${label} side-effect failed`, err);
  }
}

/**
 * Atomic booking creation.
 *
 * Conflict prevention strategy: insert into `bookings` with a uniqueness
 * predicate using a transaction-free `findOneAndUpdate` pattern. We can't
 * rely on a partial unique index alone (overlap is a range condition, not
 * an equality), so we use a "claim then verify" pattern:
 *
 *   1. Insert the booking unconditionally.
 *   2. Immediately query for any OTHER booking that overlaps + has a smaller
 *      _id (creation-order tiebreaker). If found, delete our just-inserted
 *      doc and throw ConflictError. The booking with the smaller _id wins.
 *
 * This is safe under concurrency: two simultaneous inserts both succeed, but
 * only one survives the verify step (the one with the smaller _id). The
 * other gets rolled back. ObjectId timestamps + counters make _id ordering
 * deterministic.
 */
export async function createBooking(
  input: CreateBookingInput,
  context?: { userId?: string; role?: "admin" | "worker" | "system" },
): Promise<BookingDTO> {
  const parsed = createBookingSchema.parse(input);
  await connectDB();

  const therapist = await TherapistModel.findById(parsed.therapistId).exec();
  if (!therapist) throw new NotFoundError("Therapist not found");
  if (!therapist.active) {
    throw new ValidationError("Therapist is not currently accepting bookings");
  }

  const service = await ServiceModel.findById(parsed.serviceId).exec();
  if (!service) throw new NotFoundError("Service not found");
  if (!service.active) throw new ValidationError("Service is not active");

  const startAt = new Date(parsed.startAt);
  if (Number.isNaN(startAt.getTime())) {
    throw new ValidationError("Invalid startAt");
  }
  const endAt = new Date(startAt.getTime() + service.durationMin * 60_000);

  // If a hold was supplied, verify it matches the slot.
  if (parsed.holdId) {
    if (!parsed.sessionId) {
      throw new ValidationError("sessionId is required when holdId is provided");
    }
    await verifyHold(parsed.holdId, parsed.sessionId, {
      therapistId: parsed.therapistId,
      serviceId: parsed.serviceId,
      startAt,
    });
  }

  const settings = await getSettings();
  const buffer = settings.bufferMin * 60_000;
  const checkStart = new Date(startAt.getTime() - buffer);
  const checkEnd = new Date(endAt.getTime() + buffer);

  const therapistId = new Types.ObjectId(parsed.therapistId);
  const serviceId = new Types.ObjectId(parsed.serviceId);

  // ---- claim ----
  const manageToken = crypto.randomBytes(24).toString("hex");
  const created = await BookingModel.create({
    therapistId,
    serviceId,
    customerName: parsed.customerName,
    customerEmail: parsed.customerEmail,
    customerPhone: parsed.customerPhone,
    startAt,
    endAt,
    notes: parsed.notes,
    status: "confirmed",
    manageToken,
  });

  // ---- verify (conflict check) ----
  // Tiebreaker: smallest _id wins. ObjectIds are monotonic per (machine,
  // pid, increment) so the ordering is deterministic even when two writes
  // land within the same millisecond.
  const overlaps = await BookingModel.find({
    _id: { $ne: created._id },
    therapistId,
    status: { $in: ["pending", "confirmed"] },
    startAt: { $lt: checkEnd },
    endAt: { $gt: checkStart },
  })
    .select("_id")
    .lean()
    .exec();

  if (overlaps.length > 0) {
    const myIdStr = created._id.toString();
    const winner = overlaps.reduce(
      (min, o) => (o._id.toString() < min ? o._id.toString() : min),
      myIdStr,
    );
    if (winner !== myIdStr) {
      // Another booking has priority - roll us back. Don't touch others;
      // they're playing the same algorithm and will reach the same verdict.
      await BookingModel.deleteOne({ _id: created._id }).exec();
      throw new ConflictError("Slot is no longer available");
    }
    // We won - every other concurrent insert needs to be removed. Each of
    // them will independently observe `winner !== self` and roll itself
    // back; we still issue the delete here as a belt-and-suspenders cleanup
    // in case a peer crashed before its own rollback.
    await BookingModel.deleteMany({
      _id: { $in: overlaps.map((o) => o._id) },
      status: { $in: ["pending", "confirmed"] },
    }).exec();
  }

  // Final defensive check: confirm our document survived. Covers the rare
  // race where a faster peer (incorrectly) thought it had won and deleted
  // us before we ran our own verify. If we're gone, the slot is taken.
  const stillExists = await BookingModel.exists({ _id: created._id });
  if (!stillExists) {
    throw new ConflictError("Slot is no longer available");
  }

  // Consume the hold (best-effort) so the slot is freed for re-use scenarios.
  if (parsed.holdId) {
    await consumeHold(parsed.holdId).catch(() => {});
  }

  const dto = bookingToDTO(created);
  await recordAudit({
    actorId: context?.userId,
    actorRole: context?.role ?? "system",
    action: "booking.create",
    entityType: "Booking",
    entityId: created._id.toString(),
    after: dto,
  });

  // Fire-and-forget integrations. Each service swallows provider errors;
  // `safe()` adds an extra layer in case something unexpected throws.
  const sendCtx = {
    booking: dto,
    service: serviceToDTO(service),
    therapist: therapistToDTO(therapist),
    settings,
  };
  await safe("sms.confirmation", () =>
    smsService.sendBookingConfirmation(sendCtx),
  );
  await safe("email.confirmation", () =>
    emailService.sendBookingConfirmation(sendCtx),
  );

  return dto;
}

export async function getBooking(input: GetBookingInput): Promise<BookingDTO> {
  const parsed = getBookingSchema.parse(input);
  await connectDB();
  const filter: Record<string, unknown> = {};
  if (parsed.id) filter._id = new Types.ObjectId(parsed.id);
  // The manageToken is the random hex secret stored on the Booking - we look
  // it up directly. (The `tokens.service` JWT helpers are reserved for intake
  // links where the bookingId itself is part of the payload.)
  if (parsed.manageToken) filter.manageToken = parsed.manageToken;
  const doc = await BookingModel.findOne(filter).exec();
  if (!doc) throw new NotFoundError("Booking not found");
  return bookingToDTO(doc);
}

export async function rescheduleBooking(
  input: RescheduleBookingInput,
  context?: { userId?: string; role?: "admin" | "worker" | "system" },
): Promise<BookingDTO> {
  const parsed = rescheduleBookingSchema.parse(input);
  await connectDB();

  const booking = parsed.manageToken
    ? await BookingModel.findOne({ manageToken: parsed.manageToken }).exec()
    : parsed.id
      ? await BookingModel.findById(parsed.id).exec()
      : null;
  if (!booking) throw new NotFoundError("Booking not found");
  if (booking.status === "cancelled" || booking.status === "completed") {
    throw new ValidationError(`Cannot reschedule a ${booking.status} booking`);
  }

  const service = await ServiceModel.findById(booking.serviceId).exec();
  if (!service) throw new NotFoundError("Service no longer exists");

  const newStart = new Date(parsed.newStartAt);
  const newEnd = new Date(newStart.getTime() + service.durationMin * 60_000);

  const settings = await getSettings();
  const buffer = settings.bufferMin * 60_000;
  const conflict = await BookingModel.findOne({
    _id: { $ne: booking._id },
    therapistId: booking.therapistId,
    status: { $in: ["pending", "confirmed"] },
    startAt: { $lt: new Date(newEnd.getTime() + buffer) },
    endAt: { $gt: new Date(newStart.getTime() - buffer) },
  }).exec();
  if (conflict) throw new ConflictError("Requested slot is unavailable");

  const before = bookingToDTO(booking);
  booking.startAt = newStart;
  booking.endAt = newEnd;
  booking.reminderSentAt = undefined;
  await booking.save();
  const after = bookingToDTO(booking);

  await recordAudit({
    actorId: context?.userId,
    actorRole: context?.role ?? "system",
    action: "booking.reschedule",
    entityType: "Booking",
    entityId: booking._id.toString(),
    before,
    after,
  });

  // Side effects: notify customer of the new time.
  const therapist = await TherapistModel.findById(booking.therapistId).exec();
  if (therapist) {
    const sendCtx = {
      booking: after,
      service: serviceToDTO(service),
      therapist: therapistToDTO(therapist),
      settings,
    };
    await safe("sms.reschedule", () => smsService.sendReschedule(sendCtx));
    await safe("email.reschedule", () =>
      emailService.sendReschedule(sendCtx, before.startAt),
    );
  }

  return after;
}

export async function cancelBooking(
  input: CancelBookingInput,
  context?: { userId?: string; role?: "admin" | "worker" | "system" },
): Promise<BookingDTO> {
  const parsed = cancelBookingSchema.parse(input);
  await connectDB();

  const booking = parsed.manageToken
    ? await BookingModel.findOne({ manageToken: parsed.manageToken }).exec()
    : parsed.id
      ? await BookingModel.findById(parsed.id).exec()
      : null;
  if (!booking) throw new NotFoundError("Booking not found");
  if (booking.status === "cancelled") return bookingToDTO(booking);

  const before = bookingToDTO(booking);
  booking.status = "cancelled";
  if (parsed.reason) {
    booking.notes = booking.notes
      ? `${booking.notes}\n[cancelled: ${parsed.reason}]`
      : `[cancelled: ${parsed.reason}]`;
  }
  await booking.save();
  const after = bookingToDTO(booking);

  await recordAudit({
    actorId: context?.userId,
    actorRole: context?.role ?? "system",
    action: "booking.cancel",
    entityType: "Booking",
    entityId: booking._id.toString(),
    before,
    after,
  });

  // Side effects: send cancellation SMS + email.
  const [therapist, service, settings] = await Promise.all([
    TherapistModel.findById(booking.therapistId).exec(),
    ServiceModel.findById(booking.serviceId).exec(),
    getSettings(),
  ]);
  if (therapist && service) {
    const sendCtx = {
      booking: after,
      service: serviceToDTO(service),
      therapist: therapistToDTO(therapist),
      settings,
    };
    await safe("sms.cancellation", () => smsService.sendCancellation(sendCtx));
    await safe("email.cancellation", () =>
      emailService.sendCancellation(sendCtx),
    );
  }

  return after;
}

export async function markNoShow(
  input: { id: string },
  context?: { userId?: string; role?: "admin" | "worker" | "system" },
): Promise<BookingDTO> {
  return setStatus(input.id, "no_show", context, "booking.no_show");
}

export async function markCompleted(
  input: { id: string },
  context?: { userId?: string; role?: "admin" | "worker" | "system" },
): Promise<BookingDTO> {
  return setStatus(input.id, "completed", context, "booking.complete");
}

async function setStatus(
  id: string,
  status: "no_show" | "completed",
  context: { userId?: string; role?: "admin" | "worker" | "system" } | undefined,
  action: string,
): Promise<BookingDTO> {
  await connectDB();
  const booking = await BookingModel.findById(id).exec();
  if (!booking) throw new NotFoundError("Booking not found");
  const before = bookingToDTO(booking);
  booking.status = status;
  await booking.save();
  const after = bookingToDTO(booking);
  await recordAudit({
    actorId: context?.userId,
    actorRole: context?.role ?? "system",
    action,
    entityType: "Booking",
    entityId: booking._id.toString(),
    before,
    after,
  });
  return after;
}

export async function listBookings(
  input: ListBookingsInput = { limit: 100 },
): Promise<BookingDTO[]> {
  const parsed = listBookingsSchema.parse(input);
  await connectDB();

  const filter: Record<string, unknown> = {};
  if (parsed.therapistId) {
    filter.therapistId = new Types.ObjectId(parsed.therapistId);
  }
  if (parsed.status) filter.status = parsed.status;
  if (parsed.fromDate || parsed.toDate) {
    const range: Record<string, Date> = {};
    if (parsed.fromDate) range.$gte = new Date(parsed.fromDate);
    if (parsed.toDate) range.$lte = new Date(parsed.toDate);
    filter.startAt = range;
  }
  if (parsed.customerName) {
    filter.customerName = { $regex: parsed.customerName, $options: "i" };
  }

  const docs = await BookingModel.find(filter)
    .sort({ startAt: 1 })
    .limit(parsed.limit)
    .exec();
  return docs.map(bookingToDTO);
}

export async function updateTherapistNotes(
  input: UpdateTherapistNotesInput,
  context?: { userId?: string; role?: "admin" | "worker" | "system" },
): Promise<BookingDTO> {
  const { id, notes } = updateTherapistNotesSchema.parse(input);
  await connectDB();
  const booking = await BookingModel.findById(id).exec();
  if (!booking) throw new NotFoundError("Booking not found");
  const before = bookingToDTO(booking);
  booking.therapistNotes = notes;
  await booking.save();
  const after = bookingToDTO(booking);
  await recordAudit({
    actorId: context?.userId,
    actorRole: context?.role ?? "system",
    action: "booking.update_notes",
    entityType: "Booking",
    entityId: booking._id.toString(),
    before,
    after,
  });
  return after;
}

/** Used internally by seed + integrations to mint a manage link. */
export function buildManageToken(bookingId: string): string {
  return generateManageToken(bookingId);
}
