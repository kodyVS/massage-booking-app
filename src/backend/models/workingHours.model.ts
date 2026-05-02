import { Schema, model, models, type Model, type Types } from "mongoose";

/**
 * Per-therapist weekly schedule. One row per (therapist, dayOfWeek) — the
 * therapist may have a single block of working hours each day; if you need
 * splits (e.g. morning + evening) add a second row for the same day.
 *
 * `dayOfWeek` is 0 (Sun) – 6 (Sat) to match `Date.prototype.getDay()`.
 * Times are stored as "HH:mm" strings interpreted in the business timezone.
 */
export interface IWorkingHours {
  _id: Types.ObjectId;
  therapistId: Types.ObjectId;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkingHoursDTO {
  id: string;
  therapistId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

const WorkingHoursSchema = new Schema<IWorkingHours>(
  {
    therapistId: {
      type: Schema.Types.ObjectId,
      ref: "Therapist",
      required: true,
      index: true,
    },
    dayOfWeek: { type: Number, required: true, min: 0, max: 6 },
    startTime: {
      type: String,
      required: true,
      match: [TIME_PATTERN, "startTime must be HH:mm"],
    },
    endTime: {
      type: String,
      required: true,
      match: [TIME_PATTERN, "endTime must be HH:mm"],
    },
  },
  { timestamps: true },
);

export const WorkingHoursModel: Model<IWorkingHours> =
  (models.WorkingHours as Model<IWorkingHours>) ||
  model<IWorkingHours>("WorkingHours", WorkingHoursSchema);

export function workingHoursToDTO(w: IWorkingHours): WorkingHoursDTO {
  return {
    id: w._id.toString(),
    therapistId: w.therapistId.toString(),
    dayOfWeek: w.dayOfWeek,
    startTime: w.startTime,
    endTime: w.endTime,
  };
}
