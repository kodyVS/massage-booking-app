import { z } from "zod";
import { emailSchema, objectIdSchema } from "./common";

export const getCustomerSchema = z.object({
  email: emailSchema,
});
export type GetCustomerInput = z.infer<typeof getCustomerSchema>;

export const addCustomerNoteSchema = z.object({
  customerEmail: emailSchema,
  body: z.string().min(1).max(5000),
});
export type AddCustomerNoteInput = z.infer<typeof addCustomerNoteSchema>;

export const deleteCustomerNoteSchema = z.object({
  id: objectIdSchema,
});
export type DeleteCustomerNoteInput = z.infer<typeof deleteCustomerNoteSchema>;
