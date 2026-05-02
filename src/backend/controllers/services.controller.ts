import * as servicesService from "../services/services.service";
import { ForbiddenError } from "../types/errors";
import type { ControllerInput } from "../types";
import type { ServiceDTO } from "../models/service.model";
import type {
  CreateServiceInput,
  GetServiceInput,
  LinkTherapistServiceInput,
  ListServicesInput,
  UpdateServiceInput,
} from "../validation/services.schema";

export async function list({
  input,
}: ControllerInput<ListServicesInput | undefined>): Promise<ServiceDTO[]> {
  return servicesService.listServices(input ?? { activeOnly: false });
}

export async function get({
  input,
}: ControllerInput<GetServiceInput>): Promise<ServiceDTO> {
  return servicesService.getService(input);
}

export async function create({
  input,
  context,
}: ControllerInput<CreateServiceInput>): Promise<ServiceDTO> {
  requireAdmin(context?.role);
  return servicesService.createService(input, {
    userId: context?.userId,
    role: context?.role,
  });
}

export async function update({
  input,
  context,
}: ControllerInput<UpdateServiceInput>): Promise<ServiceDTO> {
  requireAdmin(context?.role);
  return servicesService.updateService(input, {
    userId: context?.userId,
    role: context?.role,
  });
}

export async function deactivate({
  input,
  context,
}: ControllerInput<{ id: string }>): Promise<ServiceDTO> {
  requireAdmin(context?.role);
  return servicesService.deactivateService(input.id, {
    userId: context?.userId,
    role: context?.role,
  });
}

export async function link({
  input,
  context,
}: ControllerInput<LinkTherapistServiceInput>) {
  requireAdmin(context?.role);
  return servicesService.linkTherapistService(input);
}

export async function unlink({
  input,
  context,
}: ControllerInput<LinkTherapistServiceInput>): Promise<void> {
  requireAdmin(context?.role);
  return servicesService.unlinkTherapistService(input);
}

function requireAdmin(role?: string): void {
  if (role !== "admin") {
    throw new ForbiddenError("Admin access required");
  }
}
