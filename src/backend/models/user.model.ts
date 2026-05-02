import { Schema, model, models, type Model, type Types } from "mongoose";

/**
 * User account — admin or worker.
 *
 * Customers do NOT have user accounts (the public booking flow uses email +
 * a magic-link manage token instead). Only staff log in.
 *
 * `therapistId` is required for workers (links the login to their therapist
 * profile) and absent for admins.
 */
export interface IUser {
  _id: Types.ObjectId;
  email: string;
  passwordHash: string;
  role: "admin" | "worker";
  therapistId?: Types.ObjectId;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/** Plain DTO returned to callers — never includes passwordHash. */
export interface UserDTO {
  id: string;
  email: string;
  role: "admin" | "worker";
  therapistId?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

const UserSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ["admin", "worker"], required: true },
    therapistId: { type: Schema.Types.ObjectId, ref: "Therapist" },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export const UserModel: Model<IUser> =
  (models.User as Model<IUser>) || model<IUser>("User", UserSchema);

/** Convert a Mongoose user document to the public DTO. */
export function userToDTO(u: IUser): UserDTO {
  return {
    id: u._id.toString(),
    email: u.email,
    role: u.role,
    therapistId: u.therapistId?.toString(),
    active: u.active,
    createdAt: u.createdAt.toISOString(),
    updatedAt: u.updatedAt.toISOString(),
  };
}
