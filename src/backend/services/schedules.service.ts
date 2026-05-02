import { Types } from "mongoose";
import { connectDB } from "../db/connection";
import {
  TimeOffModel,
  timeOffToDTO,
  type TimeOffDTO,
} from "../models/timeOff.model";
import {
  WorkingHoursModel,
  workingHoursToDTO,
  type WorkingHoursDTO,
} from "../models/workingHours.model";
import { NotFoundError, ValidationError } from "../types/errors";
import {
  createTimeOffSchema,
  getWorkingHoursSchema,
  listTimeOffSchema,
  setWorkingHoursSchema,
  updateTimeOffStatusSchema,
  type CreateTimeOffInput,
  type GetWorkingHoursInput,
  type ListTimeOffInput,
  type SetWorkingHoursInput,
  type UpdateTimeOffStatusInput,
} from "../validation/schedules.schema";
import { getSettings } from "./settings.service";
import { record as recordAudit } from "./audit.service";

type AuditCtx = { userId?: string; role?: "admin" | "worker" | "system" };

/**
 * Replace the therapist's entire weekly schedule. Validates each row's
 * start/end and that all times stay within the business envelope from
 * Settings (admin-edited business hours).
 */
export async function setWorkingHours(
  input: SetWorkingHoursInput,
  context?: AuditCtx,
): Promise<WorkingHoursDTO[]> {
  const { therapistId, hours } = setWorkingHoursSchema.parse(input);
  const settings = await getSettings();
  const envelopeStart = toMinutes(settings.defaultOpenTime);
  const envelopeEnd = toMinutes(settings.defaultCloseTime);

  for (const row of hours) {
    const s = toMinutes(row.startTime);
    const e = toMinutes(row.endTime);
    if (s >= e) {
      throw new ValidationError("startTime must be before endTime");
    }
    if (s < envelopeStart || e > envelopeEnd) {
      throw new ValidationError(
        `Hours must fall inside business envelope ${settings.defaultOpenTime}–${settings.defaultCloseTime}`,
      );
    }
  }

  await connectDB();
  const tid = new Types.ObjectId(therapistId);
  const before = await WorkingHoursModel.find({ therapistId: tid }).lean().exec();
  await WorkingHoursModel.deleteMany({ therapistId: tid }).exec();
  if (hours.length === 0) {
    await recordAudit({
      actorId: context?.userId,
      actorRole: context?.role ?? "system",
      action: "working_hours.set",
      entityType: "WorkingHours",
      entityId: therapistId,
      before: before.map((b) => ({
        dayOfWeek: b.dayOfWeek,
        startTime: b.startTime,
        endTime: b.endTime,
      })),
      after: [],
    });
    return [];
  }
  const docs = await WorkingHoursModel.insertMany(
    hours.map((h) => ({ ...h, therapistId: tid })),
  );
  const after = docs.map(workingHoursToDTO);
  await recordAudit({
    actorId: context?.userId,
    actorRole: context?.role ?? "system",
    action: "working_hours.set",
    entityType: "WorkingHours",
    entityId: therapistId,
    before: before.map((b) => ({
      dayOfWeek: b.dayOfWeek,
      startTime: b.startTime,
      endTime: b.endTime,
    })),
    after,
  });
  return after;
}

export async function getWorkingHours(
  input: GetWorkingHoursInput,
): Promise<WorkingHoursDTO[]> {
  const { therapistId } = getWorkingHoursSchema.parse(input);
  await connectDB();
  const docs = await WorkingHoursModel.find({
    therapistId: new Types.ObjectId(therapistId),
  })
    .sort({ dayOfWeek: 1, startTime: 1 })
    .exec();
  return docs.map(workingHoursToDTO);
}

export async function createTimeOff(
  input: CreateTimeOffInput,
  context?: AuditCtx,
): Promise<TimeOffDTO> {
  const parsed = createTimeOffSchema.parse(input);
  const start = new Date(parsed.startAt);
  const end = new Date(parsed.endAt);
  if (start >= end) throw new ValidationError("startAt must be before endAt");

  await connectDB();
  const settings = await getSettings();
  // Admin-created blocks are auto-approved. Worker-created blocks follow the
  // "autoApproveWorkerTimeOff" setting; pending otherwise.
  const status =
    context?.role === "admin"
      ? "approved"
      : settings.autoApproveWorkerTimeOff
        ? "approved"
        : "pending";

  const doc = await TimeOffModel.create({
    therapistId: new Types.ObjectId(parsed.therapistId),
    startAt: start,
    endAt: end,
    reason: parsed.reason,
    status,
  });
  const dto = timeOffToDTO(doc);
  await recordAudit({
    actorId: context?.userId,
    actorRole: context?.role ?? "system",
    action: "time_off.create",
    entityType: "TimeOff",
    entityId: dto.id,
    after: dto,
  });
  return dto;
}

export async function updateTimeOffStatus(
  input: UpdateTimeOffStatusInput,
  context?: AuditCtx,
): Promise<TimeOffDTO> {
  const { id, status } = updateTimeOffStatusSchema.parse(input);
  await connectDB();
  const before = await TimeOffModel.findById(id).exec();
  if (!before) throw new NotFoundError("Time off entry not found");
  const beforeDto = timeOffToDTO(before);
  const doc = await TimeOffModel.findByIdAndUpdate(
    id,
    { status },
    { new: true },
  ).exec();
  if (!doc) throw new NotFoundError("Time off entry not found");
  const afterDto = timeOffToDTO(doc);
  await recordAudit({
    actorId: context?.userId,
    actorRole: context?.role ?? "system",
    action: "time_off.update_status",
    entityType: "TimeOff",
    entityId: id,
    before: beforeDto,
    after: afterDto,
  });
  return afterDto;
}

export async function deleteTimeOff(
  id: string,
  context?: AuditCtx,
): Promise<void> {
  await connectDB();
  const before = await TimeOffModel.findById(id).exec();
  if (!before) throw new NotFoundError("Time off entry not found");
  const beforeDto = timeOffToDTO(before);
  await TimeOffModel.deleteOne({ _id: before._id }).exec();
  await recordAudit({
    actorId: context?.userId,
    actorRole: context?.role ?? "system",
    action: "time_off.delete",
    entityType: "TimeOff",
    entityId: id,
    before: beforeDto,
  });
}

export async function listTimeOff(
  input: ListTimeOffInput = {},
): Promise<TimeOffDTO[]> {
  const { therapistId, status } = listTimeOffSchema.parse(input);
  await connectDB();
  const filter: Record<string, unknown> = {};
  if (therapistId) filter.therapistId = new Types.ObjectId(therapistId);
  if (status) filter.status = status;
  const docs = await TimeOffModel.find(filter).sort({ startAt: 1 }).exec();
  return docs.map(timeOffToDTO);
}

/**
 * Approved time-off blocks for a therapist that overlap a given day window.
 * Used by the availability service.
 */
export async function getApprovedTimeOffOverlapping(
  therapistId: string,
  windowStart: Date,
  windowEnd: Date,
): Promise<{ startAt: Date; endAt: Date }[]> {
  await connectDB();
  const docs = await TimeOffModel.find({
    therapistId: new Types.ObjectId(therapistId),
    status: "approved",
    startAt: { $lt: windowEnd },
    endAt: { $gt: windowStart },
  })
    .lean()
    .exec();
  return docs.map((d) => ({ startAt: d.startAt, endAt: d.endAt }));
}

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}
