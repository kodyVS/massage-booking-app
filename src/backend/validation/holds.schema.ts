import { z } from "zod";
import { isoDateTimeSchema, objectIdSchema } from "./common";

export const createHoldSchema = z.object({
  therapistId: objectIdSchema,
  serviceId: objectIdSchema,
  startAt: isoDateTimeSchema,
  /** Stable per-browser session id (cookie or local-generated). */
  sessionId: z.string().min(1).max(120),
});
export type CreateHoldInput = z.infer<typeof createHoldSchema>;

export const releaseHoldSchema = z.object({
  id: objectIdSchema,
  sessionId: z.string().min(1).max(120),
});
export type ReleaseHoldInput = z.infer<typeof releaseHoldSchema>;
