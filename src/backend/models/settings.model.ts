import { Schema, model, models, type Model, type Types } from "mongoose";

/**
 * Singleton settings document. Convention: there is exactly one document in
 * this collection; the settings service uses `findOne()` and `upsert` rather
 * than ids.
 *
 * - `defaultDaysOpen`: 0 (Sun) – 6 (Sat) — days the business is open by
 *   default for therapists who don't have explicit working hours
 * - `slotIntervalMin`: granularity of bookable slots (e.g. 15 → :00, :15, …)
 * - `bufferMin`: minimum gap between bookings on the same therapist
 */
export interface ISettings {
  _id: Types.ObjectId;
  defaultOpenTime: string; // "HH:mm"
  defaultCloseTime: string; // "HH:mm"
  defaultDaysOpen: number[];
  slotIntervalMin: number;
  bufferMin: number;
  cancellationPolicy: string;
  smsNotificationsEnabled: boolean;
  emailNotificationsEnabled: boolean;
  intakeRequired: boolean;
  autoApproveWorkerTimeOff: boolean;
  businessName: string;
  businessPhone: string;
  businessAddress: string;
  businessTimezone: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SettingsDTO {
  id: string;
  defaultOpenTime: string;
  defaultCloseTime: string;
  defaultDaysOpen: number[];
  slotIntervalMin: number;
  bufferMin: number;
  cancellationPolicy: string;
  smsNotificationsEnabled: boolean;
  emailNotificationsEnabled: boolean;
  intakeRequired: boolean;
  autoApproveWorkerTimeOff: boolean;
  businessName: string;
  businessPhone: string;
  businessAddress: string;
  businessTimezone: string;
  updatedAt: string;
}

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

const SettingsSchema = new Schema<ISettings>(
  {
    defaultOpenTime: {
      type: String,
      required: true,
      match: [TIME_PATTERN, "defaultOpenTime must be HH:mm"],
    },
    defaultCloseTime: {
      type: String,
      required: true,
      match: [TIME_PATTERN, "defaultCloseTime must be HH:mm"],
    },
    defaultDaysOpen: { type: [Number], default: [1, 2, 3, 4, 5] },
    slotIntervalMin: { type: Number, default: 15, min: 5 },
    bufferMin: { type: Number, default: 15, min: 0 },
    cancellationPolicy: {
      type: String,
      default: "Cancellations within 24 hours may incur a fee.",
    },
    smsNotificationsEnabled: { type: Boolean, default: true },
    emailNotificationsEnabled: { type: Boolean, default: true },
    intakeRequired: { type: Boolean, default: true },
    autoApproveWorkerTimeOff: { type: Boolean, default: false },
    businessName: { type: String, default: "Vital Touch Massage" },
    businessPhone: { type: String, default: "" },
    businessAddress: { type: String, default: "" },
    businessTimezone: { type: String, default: "America/Los_Angeles" },
  },
  { timestamps: true },
);

export const SettingsModel: Model<ISettings> =
  (models.Settings as Model<ISettings>) ||
  model<ISettings>("Settings", SettingsSchema);

export function settingsToDTO(s: ISettings): SettingsDTO {
  return {
    id: s._id.toString(),
    defaultOpenTime: s.defaultOpenTime,
    defaultCloseTime: s.defaultCloseTime,
    defaultDaysOpen: s.defaultDaysOpen ?? [],
    slotIntervalMin: s.slotIntervalMin,
    bufferMin: s.bufferMin,
    cancellationPolicy: s.cancellationPolicy,
    smsNotificationsEnabled: s.smsNotificationsEnabled,
    emailNotificationsEnabled: s.emailNotificationsEnabled,
    intakeRequired: s.intakeRequired,
    autoApproveWorkerTimeOff: s.autoApproveWorkerTimeOff ?? false,
    businessName: s.businessName,
    businessPhone: s.businessPhone,
    businessAddress: s.businessAddress,
    businessTimezone: s.businessTimezone,
    updatedAt: s.updatedAt.toISOString(),
  };
}
