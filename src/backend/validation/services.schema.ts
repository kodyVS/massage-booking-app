import { z } from "zod";
import { objectIdSchema } from "./common";

export const createServiceSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(2000).optional(),
  durationMin: z.number().int().min(5).max(8 * 60),
  price: z.number().min(0).max(10000),
  active: z.boolean().default(true),
  /** Optional initial therapist assignments. */
  therapistIds: z.array(objectIdSchema).optional(),
});
export type CreateServiceInput = z.infer<typeof createServiceSchema>;

export const updateServiceSchema = createServiceSchema.partial().extend({
  id: objectIdSchema,
});
export type UpdateServiceInput = z.infer<typeof updateServiceSchema>;

export const getServiceSchema = z.object({ id: objectIdSchema });
export type GetServiceInput = z.infer<typeof getServiceSchema>;

export const listServicesSchema = z.object({
  activeOnly: z.boolean().default(false),
  therapistId: objectIdSchema.optional(),
});
export type ListServicesInput = z.infer<typeof listServicesSchema>;

export const linkTherapistServiceSchema = z.object({
  therapistId: objectIdSchema,
  serviceId: objectIdSchema,
});
export type LinkTherapistServiceInput = z.infer<
  typeof linkTherapistServiceSchema
>;
