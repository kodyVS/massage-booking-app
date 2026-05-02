import { z } from "zod";
import { emailSchema } from "./common";

export const verifyCredentialsSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password required"),
});
export type VerifyCredentialsInput = z.infer<typeof verifyCredentialsSchema>;
