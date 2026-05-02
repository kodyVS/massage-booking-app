"use server";

import { revalidatePath } from "next/cache";
import { settingsController, type SettingsDTO } from "@/backend";
import { runAction, type ActionResult } from "@/lib/action-result";
import { getStaffContext } from "@/lib/staff-context";

export async function updateSettingsAction(
  input: unknown,
): Promise<ActionResult<SettingsDTO>> {
  return runAction(async () => {
    const context = await getStaffContext();
    const dto = await settingsController.update({
      input: input as Parameters<typeof settingsController.update>[0]["input"],
      context,
    });
    revalidatePath("/admin/settings");
    return dto;
  });
}
