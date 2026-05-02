import { Types } from "mongoose";
import { connectDB } from "../db/connection";
import {
  ServiceModel,
  serviceToDTO,
  type ServiceDTO,
} from "../models/service.model";
import {
  TherapistServiceModel,
  therapistServiceToDTO,
  type TherapistServiceDTO,
} from "../models/therapistService.model";
import { ConflictError, NotFoundError } from "../types/errors";
import {
  createServiceSchema,
  getServiceSchema,
  linkTherapistServiceSchema,
  listServicesSchema,
  updateServiceSchema,
  type CreateServiceInput,
  type GetServiceInput,
  type LinkTherapistServiceInput,
  type ListServicesInput,
  type UpdateServiceInput,
} from "../validation/services.schema";
import { record as recordAudit } from "./audit.service";

type AuditCtx = { userId?: string; role?: "admin" | "worker" | "system" };

export async function listServices(
  input: ListServicesInput = { activeOnly: false },
): Promise<ServiceDTO[]> {
  const { activeOnly, therapistId } = listServicesSchema.parse(input);
  await connectDB();
  const filter: Record<string, unknown> = {};
  if (activeOnly) filter.active = true;

  if (therapistId) {
    const links = await TherapistServiceModel.find({
      therapistId: new Types.ObjectId(therapistId),
    })
      .select("serviceId")
      .lean()
      .exec();
    filter._id = { $in: links.map((l) => l.serviceId) };
  }

  const docs = await ServiceModel.find(filter).sort({ name: 1 }).exec();
  return docs.map(serviceToDTO);
}

export async function getService(input: GetServiceInput): Promise<ServiceDTO> {
  const { id } = getServiceSchema.parse(input);
  await connectDB();
  const doc = await ServiceModel.findById(id).exec();
  if (!doc) throw new NotFoundError("Service not found");
  return serviceToDTO(doc);
}

export async function createService(
  input: CreateServiceInput,
  context?: AuditCtx,
): Promise<ServiceDTO> {
  const parsed = createServiceSchema.parse(input);
  await connectDB();
  const { therapistIds, ...payload } = parsed;
  const doc = await ServiceModel.create(payload);

  if (therapistIds?.length) {
    await TherapistServiceModel.insertMany(
      therapistIds.map((tid) => ({
        therapistId: new Types.ObjectId(tid),
        serviceId: doc._id,
      })),
      { ordered: false },
    ).catch(() => {
      /* duplicates ignored - caller may have repeated ids */
    });
  }

  const dto = serviceToDTO(doc);
  await recordAudit({
    actorId: context?.userId,
    actorRole: context?.role ?? "system",
    action: "service.create",
    entityType: "Service",
    entityId: dto.id,
    after: { ...dto, therapistIds: therapistIds ?? [] },
  });
  return dto;
}

export async function updateService(
  input: UpdateServiceInput,
  context?: AuditCtx,
): Promise<ServiceDTO> {
  const { id, therapistIds, ...patch } = updateServiceSchema.parse(input);
  await connectDB();
  const before = await ServiceModel.findById(id).exec();
  if (!before) throw new NotFoundError("Service not found");
  const beforeDto = serviceToDTO(before);
  const doc = await ServiceModel.findByIdAndUpdate(id, patch, {
    new: true,
  }).exec();
  if (!doc) throw new NotFoundError("Service not found");

  if (therapistIds) {
    await TherapistServiceModel.deleteMany({ serviceId: doc._id }).exec();
    if (therapistIds.length) {
      await TherapistServiceModel.insertMany(
        therapistIds.map((tid) => ({
          therapistId: new Types.ObjectId(tid),
          serviceId: doc._id,
        })),
        { ordered: false },
      );
    }
  }

  const afterDto = serviceToDTO(doc);
  await recordAudit({
    actorId: context?.userId,
    actorRole: context?.role ?? "system",
    action: "service.update",
    entityType: "Service",
    entityId: id,
    before: beforeDto,
    after: { ...afterDto, therapistIds: therapistIds ?? undefined },
  });
  return afterDto;
}

export async function deactivateService(
  id: string,
  context?: AuditCtx,
): Promise<ServiceDTO> {
  await connectDB();
  const doc = await ServiceModel.findByIdAndUpdate(
    id,
    { active: false },
    { new: true },
  ).exec();
  if (!doc) throw new NotFoundError("Service not found");
  const dto = serviceToDTO(doc);
  await recordAudit({
    actorId: context?.userId,
    actorRole: context?.role ?? "system",
    action: "service.deactivate",
    entityType: "Service",
    entityId: id,
    after: dto,
  });
  return dto;
}

export async function linkTherapistService(
  input: LinkTherapistServiceInput,
): Promise<TherapistServiceDTO> {
  const { therapistId, serviceId } = linkTherapistServiceSchema.parse(input);
  await connectDB();
  try {
    const doc = await TherapistServiceModel.create({
      therapistId: new Types.ObjectId(therapistId),
      serviceId: new Types.ObjectId(serviceId),
    });
    return therapistServiceToDTO(doc);
  } catch (err) {
    const e = err as { code?: number };
    if (e?.code === 11000) {
      throw new ConflictError("Link already exists");
    }
    throw err;
  }
}

export async function unlinkTherapistService(
  input: LinkTherapistServiceInput,
): Promise<void> {
  const { therapistId, serviceId } = linkTherapistServiceSchema.parse(input);
  await connectDB();
  await TherapistServiceModel.deleteOne({
    therapistId: new Types.ObjectId(therapistId),
    serviceId: new Types.ObjectId(serviceId),
  }).exec();
}

export async function listTherapistsForService(
  serviceId: string,
): Promise<string[]> {
  await connectDB();
  const links = await TherapistServiceModel.find({
    serviceId: new Types.ObjectId(serviceId),
  })
    .select("therapistId")
    .lean()
    .exec();
  return links.map((l) => l.therapistId.toString());
}
