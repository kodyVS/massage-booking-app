import { Schema, model, models, type Model, type Types } from "mongoose";

export interface IService {
  _id: Types.ObjectId;
  name: string;
  description?: string;
  durationMin: number;
  price: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ServiceDTO {
  id: string;
  name: string;
  description?: string;
  durationMin: number;
  price: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

const ServiceSchema = new Schema<IService>(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String },
    durationMin: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true, min: 0 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export const ServiceModel: Model<IService> =
  (models.Service as Model<IService>) ||
  model<IService>("Service", ServiceSchema);

export function serviceToDTO(s: IService): ServiceDTO {
  return {
    id: s._id.toString(),
    name: s.name,
    description: s.description,
    durationMin: s.durationMin,
    price: s.price,
    active: s.active,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
  };
}
