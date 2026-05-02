import { z } from "zod";
import { isoDateSchema, objectIdSchema } from "./common";

export const listAvailableSlotsSchema = z.object({
  therapistId: objectIdSchema,
  serviceId: objectIdSchema,
  /** YYYY-MM-DD interpreted in the business timezone. */
  date: isoDateSchema,
});
export type ListAvailableSlotsInput = z.infer<typeof listAvailableSlotsSchema>;

export const firstAvailableAcrossTherapistsSchema = z.object({
  serviceId: objectIdSchema,
  /** Optional starting date — defaults to today. */
  fromDate: isoDateSchema.optional(),
  /** How many days forward to scan. */
  daysAhead: z.number().int().min(1).max(60).default(14),
});
export type FirstAvailableAcrossTherapistsInput = z.infer<
  typeof firstAvailableAcrossTherapistsSchema
>;

/**
 * Service-first availability: aggregates every therapist's slots for one
 * service on one date into a deduplicated start-time list, each annotated
 * with the therapists who are free.
 */
export const slotsByServiceSchema = z.object({
  serviceId: objectIdSchema,
  /** YYYY-MM-DD interpreted in the business timezone. */
  date: isoDateSchema,
});
export type SlotsByServiceInput = z.infer<typeof slotsByServiceSchema>;
