"use server";

import { intakeController } from "@/backend";
import { runAction, type ActionResult } from "@/lib/action-result";

export interface IntakeFormFields {
  pressurePreference?: "light" | "medium" | "firm" | "deep";
  problemAreas?: string[];
  allergies?: string;
  medications?: string;
  healthConditions?: string;
  pregnancyStatus?:
    | "none"
    | "first-trimester"
    | "second-trimester"
    | "third-trimester";
  recentInjuries?: string;
  firstVisit?: boolean;
}

export async function submitIntake(
  token: string,
  data: IntakeFormFields,
): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const booking = await intakeController.submit({
      input: { token, data },
    });
    return { id: booking.id };
  });
}
