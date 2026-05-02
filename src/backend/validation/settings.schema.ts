import { z } from "zod";
import { hhmmSchema } from "./common";

export const updateSettingsSchema = z
  .object({
    defaultOpenTime: hhmmSchema,
    defaultCloseTime: hhmmSchema,
    defaultDaysOpen: z.array(z.number().int().min(0).max(6)).max(7),
    slotIntervalMin: z.number().int().min(5).max(120),
    bufferMin: z.number().int().min(0).max(120),
    cancellationPolicy: z.string().max(2000),
    smsNotificationsEnabled: z.boolean(),
    emailNotificationsEnabled: z.boolean(),
    intakeRequired: z.boolean(),
    autoApproveWorkerTimeOff: z.boolean(),
    businessName: z.string().min(1).max(100),
    businessPhone: z.string().max(40),
    businessAddress: z.string().max(300),
    businessTimezone: z.string().min(3).max(60),
  })
  .partial();
export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;
