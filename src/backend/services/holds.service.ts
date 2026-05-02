import { Types } from "mongoose";
import { connectDB } from "../db/connection";
import {
  BookingHoldModel,
  bookingHoldToDTO,
  type BookingHoldDTO,
} from "../models/bookingHold.model";
import { ServiceModel } from "../models/service.model";
import { ConflictError, NotFoundError, ValidationError } from "../types/errors";
import {
  createHoldSchema,
  releaseHoldSchema,
  type CreateHoldInput,
  type ReleaseHoldInput,
} from "../validation/holds.schema";
import { BookingModel } from "../models/booking.model";

const DEFAULT_HOLD_TTL_MIN = 10;

/**
 * Place a 10-minute soft lock on a slot. Rejects with ConflictError if
 * another active hold (different sessionId) or a confirmed/pending booking
 * already overlaps the requested window.
 *
 * The hold's `expiresAt` drives Mongo's TTL index — even if the server
 * crashes, the document is auto-removed.
 */
export async function createHold(
  input: CreateHoldInput,
  ttlMinutes: number = DEFAULT_HOLD_TTL_MIN,
): Promise<BookingHoldDTO> {
  const parsed = createHoldSchema.parse(input);
  await connectDB();

  const service = await ServiceModel.findById(parsed.serviceId).exec();
  if (!service) throw new NotFoundError("Service not found");

  const startAt = new Date(parsed.startAt);
  const endAt = new Date(startAt.getTime() + service.durationMin * 60_000);
  const therapistId = new Types.ObjectId(parsed.therapistId);
  const now = new Date();

  // Conflict against active (unexpired) holds that aren't this session's own.
  const conflictingHold = await BookingHoldModel.findOne({
    therapistId,
    sessionId: { $ne: parsed.sessionId },
    expiresAt: { $gt: now },
    startAt: { $lt: endAt },
    endAt: { $gt: startAt },
  }).exec();
  if (conflictingHold) {
    throw new ConflictError("Slot is held by another customer");
  }

  // Conflict against active bookings.
  const conflictingBooking = await BookingModel.findOne({
    therapistId,
    status: { $in: ["pending", "confirmed"] },
    startAt: { $lt: endAt },
    endAt: { $gt: startAt },
  }).exec();
  if (conflictingBooking) {
    throw new ConflictError("Slot is already booked");
  }

  const expiresAt = new Date(now.getTime() + ttlMinutes * 60_000);

  // Re-use this session's existing hold if one exists for the same slot.
  const doc = await BookingHoldModel.findOneAndUpdate(
    {
      therapistId,
      serviceId: new Types.ObjectId(parsed.serviceId),
      sessionId: parsed.sessionId,
      startAt,
    },
    {
      $set: {
        therapistId,
        serviceId: new Types.ObjectId(parsed.serviceId),
        sessionId: parsed.sessionId,
        startAt,
        endAt,
        expiresAt,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  ).exec();

  if (!doc) throw new ConflictError("Could not create hold");
  return bookingHoldToDTO(doc);
}

/**
 * Release a hold. Only the original session may release it (so a malicious
 * caller can't free someone else's slot).
 */
export async function releaseHold(input: ReleaseHoldInput): Promise<void> {
  const { id, sessionId } = releaseHoldSchema.parse(input);
  await connectDB();
  const result = await BookingHoldModel.deleteOne({
    _id: new Types.ObjectId(id),
    sessionId,
  }).exec();
  if (result.deletedCount === 0) {
    // Not found OR sessionId mismatch — tell the caller it's gone either way.
    throw new NotFoundError("Hold not found");
  }
}

/**
 * Verify an active hold matches the requested slot. Used by
 * `bookings.service.createBooking` before consuming it.
 */
export async function verifyHold(
  holdId: string,
  sessionId: string,
  expected: { therapistId: string; serviceId: string; startAt: Date },
): Promise<BookingHoldDTO> {
  await connectDB();
  const doc = await BookingHoldModel.findById(holdId).exec();
  if (!doc) throw new ValidationError("Hold has expired or does not exist");
  if (doc.sessionId !== sessionId) {
    throw new ValidationError("Hold belongs to a different session");
  }
  if (doc.expiresAt.getTime() <= Date.now()) {
    throw new ValidationError("Hold has expired");
  }
  if (
    doc.therapistId.toString() !== expected.therapistId ||
    doc.serviceId.toString() !== expected.serviceId ||
    doc.startAt.getTime() !== expected.startAt.getTime()
  ) {
    throw new ValidationError("Hold does not match requested slot");
  }
  return bookingHoldToDTO(doc);
}

/** Internal helper used by the bookings service to delete a consumed hold. */
export async function consumeHold(holdId: string): Promise<void> {
  await connectDB();
  await BookingHoldModel.deleteOne({ _id: new Types.ObjectId(holdId) }).exec();
}

/**
 * Active holds (unexpired) that overlap a given window for a therapist.
 * Used by the availability service.
 */
export async function getActiveHoldsOverlapping(
  therapistId: string,
  windowStart: Date,
  windowEnd: Date,
): Promise<{ startAt: Date; endAt: Date }[]> {
  await connectDB();
  const docs = await BookingHoldModel.find({
    therapistId: new Types.ObjectId(therapistId),
    expiresAt: { $gt: new Date() },
    startAt: { $lt: windowEnd },
    endAt: { $gt: windowStart },
  })
    .select("startAt endAt")
    .lean()
    .exec();
  return docs.map((d) => ({ startAt: d.startAt, endAt: d.endAt }));
}
