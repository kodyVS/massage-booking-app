import { Schema, model, models, type Model, type Types } from "mongoose";

/**
 * A range of UTC time during which a therapist is unavailable. Created by the
 * worker (or by the admin); admin can approve/reject. Status:
 *   - `pending`   - submitted by worker, awaiting admin approval
 *   - `approved`  - counts against availability
 *   - `rejected`  - does not count against availability
 */
export interface ITimeOff {
  _id: Types.ObjectId;
  therapistId: Types.ObjectId;
  startAt: Date;
  endAt: Date;
  reason?: string;
  status: "pending" | "approved" | "rejected";
  createdAt: Date;
  updatedAt: Date;
}

export interface TimeOffDTO {
  id: string;
  therapistId: string;
  startAt: string;
  endAt: string;
  reason?: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
  updatedAt: string;
}

const TimeOffSchema = new Schema<ITimeOff>(
  {
    therapistId: {
      type: Schema.Types.ObjectId,
      ref: "Therapist",
      required: true,
      index: true,
    },
    startAt: { type: Date, required: true },
    endAt: { type: Date, required: true },
    reason: { type: String },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
  },
  { timestamps: true },
);

TimeOffSchema.index({ therapistId: 1, startAt: 1 });

export const TimeOffModel: Model<ITimeOff> =
  (models.TimeOff as Model<ITimeOff>) ||
  model<ITimeOff>("TimeOff", TimeOffSchema);

export function timeOffToDTO(t: ITimeOff): TimeOffDTO {
  return {
    id: t._id.toString(),
    therapistId: t.therapistId.toString(),
    startAt: t.startAt.toISOString(),
    endAt: t.endAt.toISOString(),
    reason: t.reason,
    status: t.status,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  };
}
