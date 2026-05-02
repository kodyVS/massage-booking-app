import { Schema, model, models, type Model, type Types } from "mongoose";

/**
 * Append-only log of every write action by an authenticated user (admin or
 * worker). Public booking flow writes are NOT recorded here — those carry
 * no actor identity. `before` / `after` are JSON snapshots for diffing.
 */
export interface IAuditLog {
  _id: Types.ObjectId;
  actorId?: Types.ObjectId;
  actorRole?: "admin" | "worker" | "system";
  action: string;
  entityType: string;
  entityId?: string;
  before?: unknown;
  after?: unknown;
  createdAt: Date;
}

export interface AuditLogDTO {
  id: string;
  actorId?: string;
  actorRole?: "admin" | "worker" | "system";
  action: string;
  entityType: string;
  entityId?: string;
  before?: unknown;
  after?: unknown;
  createdAt: string;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    actorId: { type: Schema.Types.ObjectId, ref: "User" },
    actorRole: { type: String, enum: ["admin", "worker", "system"] },
    action: { type: String, required: true },
    entityType: { type: String, required: true },
    entityId: String,
    before: Schema.Types.Mixed,
    after: Schema.Types.Mixed,
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

AuditLogSchema.index({ createdAt: -1 });
AuditLogSchema.index({ entityType: 1, entityId: 1, createdAt: -1 });

export const AuditLogModel: Model<IAuditLog> =
  (models.AuditLog as Model<IAuditLog>) ||
  model<IAuditLog>("AuditLog", AuditLogSchema);

export function auditLogToDTO(a: IAuditLog): AuditLogDTO {
  return {
    id: a._id.toString(),
    actorId: a.actorId?.toString(),
    actorRole: a.actorRole,
    action: a.action,
    entityType: a.entityType,
    entityId: a.entityId,
    before: a.before,
    after: a.after,
    createdAt: a.createdAt.toISOString(),
  };
}
