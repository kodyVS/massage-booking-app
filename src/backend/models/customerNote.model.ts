import { Schema, model, models, type Model, type Types } from "mongoose";

/**
 * Admin-private notes attached to a customer (keyed by lowercased email).
 * Customers do NOT have user accounts, so we identify them by booking email.
 * Workers cannot see these.
 */
export interface ICustomerNote {
  _id: Types.ObjectId;
  customerEmail: string;
  body: string;
  authorId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface CustomerNoteDTO {
  id: string;
  customerEmail: string;
  body: string;
  authorId?: string;
  createdAt: string;
  updatedAt: string;
}

const CustomerNoteSchema = new Schema<ICustomerNote>(
  {
    customerEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    body: { type: String, required: true, maxlength: 5000 },
    authorId: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

CustomerNoteSchema.index({ customerEmail: 1, createdAt: -1 });

export const CustomerNoteModel: Model<ICustomerNote> =
  (models.CustomerNote as Model<ICustomerNote>) ||
  model<ICustomerNote>("CustomerNote", CustomerNoteSchema);

export function customerNoteToDTO(n: ICustomerNote): CustomerNoteDTO {
  return {
    id: n._id.toString(),
    customerEmail: n.customerEmail,
    body: n.body,
    authorId: n.authorId?.toString(),
    createdAt: n.createdAt.toISOString(),
    updatedAt: n.updatedAt.toISOString(),
  };
}
