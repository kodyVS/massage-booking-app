import { Types } from "mongoose";
import { connectDB } from "../db/connection";
import {
  TherapistModel,
  therapistToDTO,
  type TherapistDTO,
} from "../models/therapist.model";
import { TherapistServiceModel } from "../models/therapistService.model";
import { NotFoundError } from "../types/errors";
import {
  createTherapistSchema,
  getTherapistSchema,
  listTherapistsSchema,
  updateTherapistSchema,
  type CreateTherapistInput,
  type GetTherapistInput,
  type ListTherapistsInput,
  type UpdateTherapistInput,
} from "../validation/therapists.schema";
import { record as recordAudit } from "./audit.service";

type AuditCtx = { userId?: string; role?: "admin" | "worker" | "system" };

export async function listTherapists(
  input: ListTherapistsInput = { activeOnly: false },
): Promise<TherapistDTO[]> {
  const { activeOnly, serviceId } = listTherapistsSchema.parse(input);
  await connectDB();

  const filter: Record<string, unknown> = {};
  if (activeOnly) filter.active = true;

  if (serviceId) {
    const links = await TherapistServiceModel.find({
      serviceId: new Types.ObjectId(serviceId),
    })
      .select("therapistId")
      .lean()
      .exec();
    filter._id = { $in: links.map((l) => l.therapistId) };
  }

  const docs = await TherapistModel.find(filter).sort({ name: 1 }).exec();
  return docs.map(therapistToDTO);
}

export async function getTherapist(
  input: GetTherapistInput,
): Promise<TherapistDTO> {
  const { id } = getTherapistSchema.parse(input);
  await connectDB();
  const doc = await TherapistModel.findById(id).exec();
  if (!doc) throw new NotFoundError("Therapist not found");
  return therapistToDTO(doc);
}

export async function createTherapist(
  input: CreateTherapistInput,
  context?: AuditCtx,
): Promise<TherapistDTO> {
  const parsed = createTherapistSchema.parse(input);
  await connectDB();
  const doc = await TherapistModel.create(parsed);
  const dto = therapistToDTO(doc);
  await recordAudit({
    actorId: context?.userId,
    actorRole: context?.role ?? "system",
    action: "therapist.create",
    entityType: "Therapist",
    entityId: dto.id,
    after: dto,
  });
  return dto;
}

export async function updateTherapist(
  input: UpdateTherapistInput,
  context?: AuditCtx,
): Promise<TherapistDTO> {
  const { id, ...patch } = updateTherapistSchema.parse(input);
  await connectDB();
  const before = await TherapistModel.findById(id).exec();
  if (!before) throw new NotFoundError("Therapist not found");
  const beforeDto = therapistToDTO(before);
  const doc = await TherapistModel.findByIdAndUpdate(id, patch, {
    new: true,
  }).exec();
  if (!doc) throw new NotFoundError("Therapist not found");
  const afterDto = therapistToDTO(doc);
  await recordAudit({
    actorId: context?.userId,
    actorRole: context?.role ?? "system",
    action: "therapist.update",
    entityType: "Therapist",
    entityId: id,
    before: beforeDto,
    after: afterDto,
  });
  return afterDto;
}

export async function deactivateTherapist(
  id: string,
  context?: AuditCtx,
): Promise<TherapistDTO> {
  await connectDB();
  const doc = await TherapistModel.findByIdAndUpdate(
    id,
    { active: false },
    { new: true },
  ).exec();
  if (!doc) throw new NotFoundError("Therapist not found");
  const dto = therapistToDTO(doc);
  await recordAudit({
    actorId: context?.userId,
    actorRole: context?.role ?? "system",
    action: "therapist.deactivate",
    entityType: "Therapist",
    entityId: id,
    after: dto,
  });
  return dto;
}
