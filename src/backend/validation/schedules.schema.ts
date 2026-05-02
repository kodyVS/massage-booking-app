import { z } from "zod";
import { hhmmSchema, isoDateTimeSchema, objectIdSchema } from "./common";

export const setWorkingHoursSchema = z.object({
  therapistId: objectIdSchema,
  /** Replaces ALL existing working hours rows for this therapist. */
  hours: z
    .array(
      z.object({
        dayOfWeek: z.number().int().min(0).max(6),
        startTime: hhmmSchema,
        endTime: hhmmSchema,
      }),
    )
    .max(50),
});
export type SetWorkingHoursInput = z.infer<typeof setWorkingHoursSchema>;

export const getWorkingHoursSchema = z.object({
  therapistId: objectIdSchema,
});
export type GetWorkingHoursInput = z.infer<typeof getWorkingHoursSchema>;

export const createTimeOffSchema = z.object({
  therapistId: objectIdSchema,
  startAt: isoDateTimeSchema,
  endAt: isoDateTimeSchema,
  reason: z.string().max(500).optional(),
});
export type CreateTimeOffInput = z.infer<typeof createTimeOffSchema>;

export const updateTimeOffStatusSchema = z.object({
  id: objectIdSchema,
  status: z.enum(["approved", "rejected"]),
});
export type UpdateTimeOffStatusInput = z.infer<
  typeof updateTimeOffStatusSchema
>;

export const listTimeOffSchema = z.object({
  therapistId: objectIdSchema.optional(),
  status: z.enum(["pending", "approved", "rejected"]).optional(),
});
export type ListTimeOffInput = z.infer<typeof listTimeOffSchema>;
