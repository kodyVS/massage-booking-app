import * as therapistsService from "../services/therapists.service";
import { ForbiddenError } from "../types/errors";
import type { ControllerInput } from "../types";
import type { TherapistDTO } from "../models/therapist.model";
import type {
  CreateTherapistInput,
  GetTherapistInput,
  ListTherapistsInput,
  UpdateTherapistInput,
} from "../validation/therapists.schema";

export async function list({
  input,
}: ControllerInput<ListTherapistsInput | undefined>): Promise<TherapistDTO[]> {
  return therapistsService.listTherapists(input ?? { activeOnly: false });
}

export async function get({
  input,
}: ControllerInput<GetTherapistInput>): Promise<TherapistDTO> {
  return therapistsService.getTherapist(input);
}

export async function create({
  input,
  context,
}: ControllerInput<CreateTherapistInput>): Promise<TherapistDTO> {
  requireAdmin(context?.role);
  return therapistsService.createTherapist(input, {
    userId: context?.userId,
    role: context?.role,
  });
}

export async function update({
  input,
  context,
}: ControllerInput<UpdateTherapistInput>): Promise<TherapistDTO> {
  requireAdmin(context?.role);
  return therapistsService.updateTherapist(input, {
    userId: context?.userId,
    role: context?.role,
  });
}

export async function deactivate({
  input,
  context,
}: ControllerInput<{ id: string }>): Promise<TherapistDTO> {
  requireAdmin(context?.role);
  return therapistsService.deactivateTherapist(input.id, {
    userId: context?.userId,
    role: context?.role,
  });
}

function requireAdmin(role?: string): void {
  if (role !== "admin") {
    throw new ForbiddenError("Admin access required");
  }
}
