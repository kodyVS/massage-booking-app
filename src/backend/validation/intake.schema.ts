import { z } from "zod";
import { intakeFormDataSchema } from "./bookings.schema";

export const intakeTokenSchema = z.object({ token: z.string().min(10) });
export type IntakeTokenInput = z.infer<typeof intakeTokenSchema>;

export const submitIntakeSchema = z.object({
  token: z.string().min(10),
  data: intakeFormDataSchema,
});
export type SubmitIntakeInput = z.infer<typeof submitIntakeSchema>;
