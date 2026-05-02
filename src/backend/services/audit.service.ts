import { connectDB } from "../db/connection";
import { AuditLogModel } from "../models";
import { Types } from "mongoose";

export interface RecordAuditInput {
  actorId?: string;
  actorRole?: "admin" | "worker" | "system";
  action: string;
  entityType: string;
  entityId?: string;
  before?: unknown;
  after?: unknown;
}

/**
 * Append a single audit-log entry. Failures are swallowed (logged) so an
 * audit problem cannot break the user-facing operation it's recording.
 */
export async function record(input: RecordAuditInput): Promise<void> {
  try {
    await connectDB();
    await AuditLogModel.create({
      actorId: input.actorId
        ? new Types.ObjectId(input.actorId)
        : undefined,
      actorRole: input.actorRole,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      before: input.before,
      after: input.after,
    });
  } catch (err) {
    console.error("[audit] failed to record entry", err);
  }
}
