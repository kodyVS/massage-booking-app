import { Schema, model, models, type Model, type Types } from "mongoose";

/**
 * A 10-minute soft lock on a slot while a customer fills out the booking
 * form. Mongo's TTL monitor deletes documents whose `expiresAt` is in the
 * past (the index runs every ~60s server-side). The availability service
 * also filters out expired holds in case the monitor hasn't run yet.
 */
export interface IBookingHold {
  _id: Types.ObjectId;
  therapistId: Types.ObjectId;
  serviceId: Types.ObjectId;
  startAt: Date;
  endAt: Date;
  /** Anonymous browser session id; only the original session can release. */
  sessionId: string;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface BookingHoldDTO {
  id: string;
  therapistId: string;
  serviceId: string;
  startAt: string;
  endAt: string;
  sessionId: string;
  expiresAt: string;
  createdAt: string;
}

const BookingHoldSchema = new Schema<IBookingHold>(
  {
    therapistId: {
      type: Schema.Types.ObjectId,
      ref: "Therapist",
      required: true,
    },
    serviceId: {
      type: Schema.Types.ObjectId,
      ref: "Service",
      required: true,
    },
    startAt: { type: Date, required: true },
    endAt: { type: Date, required: true },
    sessionId: { type: String, required: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true },
);

// Mongo expires the hold at `expiresAt` automatically. expireAfterSeconds=0
// means "delete when expiresAt is reached" (vs. relative-to-createdAt).
BookingHoldSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
// Overlap queries.
BookingHoldSchema.index({ therapistId: 1, startAt: 1 });

export const BookingHoldModel: Model<IBookingHold> =
  (models.BookingHold as Model<IBookingHold>) ||
  model<IBookingHold>("BookingHold", BookingHoldSchema);

export function bookingHoldToDTO(h: IBookingHold): BookingHoldDTO {
  return {
    id: h._id.toString(),
    therapistId: h.therapistId.toString(),
    serviceId: h.serviceId.toString(),
    startAt: h.startAt.toISOString(),
    endAt: h.endAt.toISOString(),
    sessionId: h.sessionId,
    expiresAt: h.expiresAt.toISOString(),
    createdAt: h.createdAt.toISOString(),
  };
}
