import * as schedulesService from "../services/schedules.service";
import { ForbiddenError } from "../types/errors";
import type { ControllerInput, RequestContext } from "../types";
import type {
  WorkingHoursDTO,
} from "../models/workingHours.model";
import type { TimeOffDTO } from "../models/timeOff.model";
import type {
  CreateTimeOffInput,
  GetWorkingHoursInput,
  ListTimeOffInput,
  SetWorkingHoursInput,
  UpdateTimeOffStatusInput,
} from "../validation/schedules.schema";

export async function getWorkingHours({
  input,
}: ControllerInput<GetWorkingHoursInput>): Promise<WorkingHoursDTO[]> {
  return schedulesService.getWorkingHours(input);
}

export async function setWorkingHours({
  input,
  context,
}: ControllerInput<SetWorkingHoursInput>): Promise<WorkingHoursDTO[]> {
  requireWriteAccess(input.therapistId, context);
  return schedulesService.setWorkingHours(input, {
    userId: context?.userId,
    role: context?.role,
  });
}

export async function createTimeOff({
  input,
  context,
}: ControllerInput<CreateTimeOffInput>): Promise<TimeOffDTO> {
  requireWriteAccess(input.therapistId, context);
  return schedulesService.createTimeOff(input, {
    userId: context?.userId,
    role: context?.role,
  });
}

export async function updateTimeOffStatus({
  input,
  context,
}: ControllerInput<UpdateTimeOffStatusInput>): Promise<TimeOffDTO> {
  if (context?.role !== "admin") {
    throw new ForbiddenError("Admin access required");
  }
  return schedulesService.updateTimeOffStatus(input, {
    userId: context?.userId,
    role: context?.role,
  });
}

export async function deleteTimeOff({
  input,
  context,
}: ControllerInput<{ id: string; therapistId: string }>): Promise<void> {
  requireWriteAccess(input.therapistId, context);
  await schedulesService.deleteTimeOff(input.id, {
    userId: context?.userId,
    role: context?.role,
  });
}

export async function listTimeOff({
  input,
  context,
}: ControllerInput<ListTimeOffInput | undefined>): Promise<TimeOffDTO[]> {
  // Workers can only see their own time-off; admins see anything.
  if (context?.role === "worker" && context.therapistId) {
    return schedulesService.listTimeOff({ ...(input ?? {}), therapistId: context.therapistId });
  }
  if (context?.role !== "admin") {
    throw new ForbiddenError("Authentication required");
  }
  return schedulesService.listTimeOff(input ?? {});
}

function requireWriteAccess(
  therapistId: string,
  context: RequestContext | undefined,
): void {
  if (context?.role === "admin") return;
  if (context?.role === "worker" && context.therapistId === therapistId) return;
  throw new ForbiddenError("Cannot modify another therapist's schedule");
}
