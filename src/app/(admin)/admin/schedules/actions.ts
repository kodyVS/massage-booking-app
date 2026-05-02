"use server";

import { revalidatePath } from "next/cache";
import { schedulesController, type TimeOffDTO } from "@/backend";
import { runAction, type ActionResult } from "@/lib/action-result";
import { getStaffContext } from "@/lib/staff-context";

export async function blockTimeAction(
  therapistId: string,
  startAt: string,
  endAt: string,
  reason?: string,
): Promise<ActionResult<TimeOffDTO>> {
  return runAction(async () => {
    const context = await getStaffContext();
    const dto = await schedulesController.createTimeOff({
      input: { therapistId, startAt, endAt, reason },
      context,
    });
    revalidatePath("/admin/schedules");
    revalidatePath("/portal/schedule");
    return dto;
  });
}

export async function deleteBlockAction(
  id: string,
  therapistId: string,
): Promise<ActionResult<void>> {
  return runAction(async () => {
    const context = await getStaffContext();
    await schedulesController.deleteTimeOff({
      input: { id, therapistId },
      context,
    });
    revalidatePath("/admin/schedules");
    revalidatePath("/portal/schedule");
  });
}

export async function approveTimeOffAction(
  id: string,
): Promise<ActionResult<TimeOffDTO>> {
  return runAction(async () => {
    const context = await getStaffContext();
    const dto = await schedulesController.updateTimeOffStatus({
      input: { id, status: "approved" },
      context,
    });
    revalidatePath("/admin/schedules");
    return dto;
  });
}

export async function rejectTimeOffAction(
  id: string,
): Promise<ActionResult<TimeOffDTO>> {
  return runAction(async () => {
    const context = await getStaffContext();
    const dto = await schedulesController.updateTimeOffStatus({
      input: { id, status: "rejected" },
      context,
    });
    revalidatePath("/admin/schedules");
    return dto;
  });
}
