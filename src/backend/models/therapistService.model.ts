import { Schema, model, models, type Model, type Types } from "mongoose";

/** Join row: which therapist offers which service. */
export interface ITherapistService {
  _id: Types.ObjectId;
  therapistId: Types.ObjectId;
  serviceId: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface TherapistServiceDTO {
  id: string;
  therapistId: string;
  serviceId: string;
  createdAt: string;
  updatedAt: string;
}

const TherapistServiceSchema = new Schema<ITherapistService>(
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
  },
  { timestamps: true },
);

// One row per (therapist, service) pair.
TherapistServiceSchema.index(
  { therapistId: 1, serviceId: 1 },
  { unique: true },
);

export const TherapistServiceModel: Model<ITherapistService> =
  (models.TherapistService as Model<ITherapistService>) ||
  model<ITherapistService>("TherapistService", TherapistServiceSchema);

export function therapistServiceToDTO(
  t: ITherapistService,
): TherapistServiceDTO {
  return {
    id: t._id.toString(),
    therapistId: t.therapistId.toString(),
    serviceId: t.serviceId.toString(),
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  };
}
