"use server";

import { revalidatePath } from "next/cache";
import { servicesController, type ServiceDTO } from "@/backend";
import { runAction, type ActionResult } from "@/lib/action-result";
import { getStaffContext } from "@/lib/staff-context";

export async function createServiceAction(
  input: unknown,
): Promise<ActionResult<ServiceDTO>> {
  return runAction(async () => {
    const context = await getStaffContext();
    const dto = await servicesController.create({
      input: input as Parameters<typeof servicesController.create>[0]["input"],
      context,
    });
    revalidatePath("/admin/services");
    return dto;
  });
}

export async function updateServiceAction(
  input: unknown,
): Promise<ActionResult<ServiceDTO>> {
  return runAction(async () => {
    const context = await getStaffContext();
    const dto = await servicesController.update({
      input: input as Parameters<typeof servicesController.update>[0]["input"],
      context,
    });
    revalidatePath("/admin/services");
    return dto;
  });
}

export async function deactivateServiceAction(
  id: string,
): Promise<ActionResult<ServiceDTO>> {
  return runAction(async () => {
    const context = await getStaffContext();
    const dto = await servicesController.deactivate({ input: { id }, context });
    revalidatePath("/admin/services");
    return dto;
  });
}
