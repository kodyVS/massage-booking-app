"use server";

import { revalidatePath } from "next/cache";
import { schedulesController, type TimeOffDTO, type WorkingHoursDTO } from "@/backend";
import { runAction, type ActionResult } from "@/lib/action-result";
import { getStaffContext } from "@/lib/staff-context";

export async function setMyHoursAction(
  hours: { dayOfWeek: number; startTime: string; endTime: string }[],
): Promise<ActionResult<WorkingHoursDTO[]>> {
  return runAction(async () => {
    const context = await getStaffContext();
    if (!context.therapistId) throw new Error("Worker has no therapistId");
    const dto = await schedulesController.setWorkingHours({
      input: { therapistId: context.therapistId, hours },
      context,
    });
    revalidatePath("/portal/hours");
    return dto;
  });
}

export async function requestTimeOffAction(
  startAt: string,
  endAt: string,
  reason?: string,
): Promise<ActionResult<TimeOffDTO>> {
  return runAction(async () => {
    const context = await getStaffContext();
    if (!context.therapistId) throw new Error("Worker has no therapistId");
    const dto = await schedulesController.createTimeOff({
      input: { therapistId: context.therapistId, startAt, endAt, reason },
      context,
    });
    revalidatePath("/portal/availability");
    revalidatePath("/portal/schedule");
    return dto;
  });
}

export async function deleteMyTimeOffAction(
  id: string,
): Promise<ActionResult<void>> {
  return runAction(async () => {
    const context = await getStaffContext();
    if (!context.therapistId) throw new Error("Worker has no therapistId");
    await schedulesController.deleteTimeOff({
      input: { id, therapistId: context.therapistId },
      context,
    });
    revalidatePath("/portal/availability");
    revalidatePath("/portal/schedule");
  });
}
