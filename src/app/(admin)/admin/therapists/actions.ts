"use server";

import { revalidatePath } from "next/cache";
import { therapistsController, type TherapistDTO } from "@/backend";
import { runAction, type ActionResult } from "@/lib/action-result";
import { getStaffContext } from "@/lib/staff-context";

export async function createTherapistAction(
  input: unknown,
): Promise<ActionResult<TherapistDTO>> {
  return runAction(async () => {
    const context = await getStaffContext();
    const dto = await therapistsController.create({
      input: input as Parameters<typeof therapistsController.create>[0]["input"],
      context,
    });
    revalidatePath("/admin/therapists");
    return dto;
  });
}

export async function updateTherapistAction(
  input: unknown,
): Promise<ActionResult<TherapistDTO>> {
  return runAction(async () => {
    const context = await getStaffContext();
    const dto = await therapistsController.update({
      input: input as Parameters<typeof therapistsController.update>[0]["input"],
      context,
    });
    revalidatePath("/admin/therapists");
    return dto;
  });
}

export async function deactivateTherapistAction(
  id: string,
): Promise<ActionResult<TherapistDTO>> {
  return runAction(async () => {
    const context = await getStaffContext();
    const dto = await therapistsController.deactivate({
      input: { id },
      context,
    });
    revalidatePath("/admin/therapists");
    return dto;
  });
}
