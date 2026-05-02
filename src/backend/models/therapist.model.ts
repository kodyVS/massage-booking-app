import { Schema, model, models, type Model, type Types } from "mongoose";

export interface ITherapist {
  _id: Types.ObjectId;
  name: string;
  photoUrl?: string;
  bio?: string;
  specialties: string[];
  licenseNumber?: string;
  yearsExperience?: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface TherapistDTO {
  id: string;
  name: string;
  photoUrl?: string;
  bio?: string;
  specialties: string[];
  licenseNumber?: string;
  yearsExperience?: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

const TherapistSchema = new Schema<ITherapist>(
  {
    name: { type: String, required: true, trim: true },
    photoUrl: { type: String, trim: true },
    bio: { type: String },
    specialties: { type: [String], default: [] },
    licenseNumber: { type: String, trim: true },
    yearsExperience: { type: Number, min: 0 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export const TherapistModel: Model<ITherapist> =
  (models.Therapist as Model<ITherapist>) ||
  model<ITherapist>("Therapist", TherapistSchema);

export function therapistToDTO(t: ITherapist): TherapistDTO {
  return {
    id: t._id.toString(),
    name: t.name,
    photoUrl: t.photoUrl,
    bio: t.bio,
    specialties: t.specialties ?? [],
    licenseNumber: t.licenseNumber,
    yearsExperience: t.yearsExperience,
    active: t.active,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  };
}
