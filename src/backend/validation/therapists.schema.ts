import { z } from "zod";
import { objectIdSchema } from "./common";

export const createTherapistSchema = z.object({
  name: z.string().min(1).max(100),
  photoUrl: z.string().url().optional(),
  bio: z.string().max(2000).optional(),
  specialties: z.array(z.string().min(1).max(60)).default([]),
  licenseNumber: z.string().max(60).optional(),
  yearsExperience: z.number().int().min(0).max(80).optional(),
  active: z.boolean().default(true),
});
export type CreateTherapistInput = z.infer<typeof createTherapistSchema>;

export const updateTherapistSchema = createTherapistSchema.partial().extend({
  id: objectIdSchema,
});
export type UpdateTherapistInput = z.infer<typeof updateTherapistSchema>;

export const getTherapistSchema = z.object({ id: objectIdSchema });
export type GetTherapistInput = z.infer<typeof getTherapistSchema>;

export const listTherapistsSchema = z.object({
  activeOnly: z.boolean().default(false),
  serviceId: objectIdSchema.optional(),
});
export type ListTherapistsInput = z.infer<typeof listTherapistsSchema>;
