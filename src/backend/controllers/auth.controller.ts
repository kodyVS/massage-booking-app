import * as authService from "../services/auth.service";
import type { ControllerInput, RequestContext } from "../types";
import type { UserDTO } from "../models/user.model";
import type { VerifyCredentialsInput } from "../validation/auth.schema";

/**
 * Verify login credentials. Wrapped by NextAuth's credentials provider in
 * `src/app/api/auth/[...nextauth]/route.ts` — the backend itself never
 * imports NextAuth.
 */
export async function verifyCredentials({
  input,
}: ControllerInput<VerifyCredentialsInput>): Promise<UserDTO> {
  return authService.verifyCredentials(input);
}

export async function getMe({
  context,
}: {
  context?: RequestContext;
}): Promise<UserDTO | null> {
  if (!context?.userId) return null;
  return authService.getUserById(context.userId);
}
