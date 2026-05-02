import { Schema, model, models, type Model, type Types } from "mongoose";

/**
 * Customer intake form. Optional — only filled out via the magic-link intake
 * page after booking is created. `signedAt` is the timestamp the customer
 * submitted the form (their digital signature).
 */
export interface IIntakeFormData {
  pressurePreference?: "light" | "medium" | "firm" | "deep";
  problemAreas?: string[];
  allergies?: string;
  medications?: string;
  healthConditions?: string;
  pregnancyStatus?: "none" | "first-trimester" | "second-trimester" | "third-trimester";
  recentInjuries?: string;
  firstVisit?: boolean;
  signedAt?: Date;
}

export interface IBooking {
  _id: Types.ObjectId;
  therapistId: Types.ObjectId;
  serviceId: Types.ObjectId;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  startAt: Date;
  endAt: Date;
  status: "pending" | "confirmed" | "cancelled" | "completed" | "no_show";
  notes?: string;
  /** Therapist-only private notes, not visible to customer. */
  therapistNotes?: string;
  intakeFormData?: IIntakeFormData;
  /** Magic-link token used to manage the booking without an account. */
  manageToken: string;
  reminderSentAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface BookingDTO {
  id: string;
  therapistId: string;
  serviceId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  startAt: string;
  endAt: string;
  status: "pending" | "confirmed" | "cancelled" | "completed" | "no_show";
  notes?: string;
  therapistNotes?: string;
  intakeFormData?: IIntakeFormData;
  manageToken: string;
  reminderSentAt?: string;
  createdAt: string;
  updatedAt: string;
}

const IntakeSchema = new Schema<IIntakeFormData>(
  {
    pressurePreference: {
      type: String,
      enum: ["light", "medium", "firm", "deep"],
    },
    problemAreas: { type: [String], default: undefined },
    allergies: String,
    medications: String,
    healthConditions: String,
    pregnancyStatus: {
      type: String,
      enum: ["none", "first-trimester", "second-trimester", "third-trimester"],
    },
    recentInjuries: String,
    firstVisit: Boolean,
    signedAt: Date,
  },
  { _id: false },
);

const BookingSchema = new Schema<IBooking>(
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
    customerName: { type: String, required: true, trim: true },
    customerEmail: { type: String, required: true, lowercase: true, trim: true },
    customerPhone: { type: String, required: true, trim: true },
    startAt: { type: Date, required: true },
    endAt: { type: Date, required: true },
    status: {
      type: String,
      enum: ["pending", "confirmed", "cancelled", "completed", "no_show"],
      default: "confirmed",
    },
    notes: String,
    therapistNotes: String,
    intakeFormData: { type: IntakeSchema, default: undefined },
    manageToken: { type: String, required: true, unique: true, index: true },
    reminderSentAt: Date,
  },
  { timestamps: true },
);

// Compound index — overlap queries always filter by therapistId then by time.
BookingSchema.index({ therapistId: 1, startAt: 1 });
// Helper for queries like "all upcoming bookings for a therapist".
BookingSchema.index({ therapistId: 1, status: 1, startAt: 1 });
// Helper for the reminder cron's "bookings in the 24h window" scan.
BookingSchema.index({ status: 1, startAt: 1, reminderSentAt: 1 });

export const BookingModel: Model<IBooking> =
  (models.Booking as Model<IBooking>) ||
  model<IBooking>("Booking", BookingSchema);

export function bookingToDTO(b: IBooking): BookingDTO {
  return {
    id: b._id.toString(),
    therapistId: b.therapistId.toString(),
    serviceId: b.serviceId.toString(),
    customerName: b.customerName,
    customerEmail: b.customerEmail,
    customerPhone: b.customerPhone,
    startAt: b.startAt.toISOString(),
    endAt: b.endAt.toISOString(),
    status: b.status,
    notes: b.notes,
    therapistNotes: b.therapistNotes,
    intakeFormData: b.intakeFormData,
    manageToken: b.manageToken,
    reminderSentAt: b.reminderSentAt?.toISOString(),
    createdAt: b.createdAt.toISOString(),
    updatedAt: b.updatedAt.toISOString(),
  };
}
