import bcrypt from "bcryptjs";
import { connectDB } from "../db/connection";
import { UserModel, userToDTO, type UserDTO } from "../models/user.model";
import { UnauthorizedError, ValidationError } from "../types/errors";
import {
  verifyCredentialsSchema,
  type VerifyCredentialsInput,
} from "../validation/auth.schema";

const BCRYPT_ROUNDS = 10;

/**
 * Hash a plain-text password. Used by the seed script and (eventually) the
 * admin user-management screens.
 */
export async function hashPassword(plaintext: string): Promise<string> {
  if (!plaintext || plaintext.length < 6) {
    throw new ValidationError("Password must be at least 6 characters");
  }
  return bcrypt.hash(plaintext, BCRYPT_ROUNDS);
}

/**
 * Validate a login attempt. Returns the user DTO on success; throws
 * UnauthorizedError on any failure (wrong email, wrong password, deactivated
 * account). NextAuth's credentials provider wraps this — there is no
 * NextAuth import inside the backend module.
 */
export async function verifyCredentials(
  input: VerifyCredentialsInput,
): Promise<UserDTO> {
  const { email, password } = verifyCredentialsSchema.parse(input);

  await connectDB();
  const user = await UserModel.findOne({ email }).exec();
  if (!user) throw new UnauthorizedError("Invalid email or password");
  if (!user.active) throw new UnauthorizedError("Account is deactivated");

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) throw new UnauthorizedError("Invalid email or password");

  return userToDTO(user);
}

/** Look up a user by id (no password check). */
export async function getUserById(id: string): Promise<UserDTO | null> {
  await connectDB();
  const user = await UserModel.findById(id).exec();
  return user ? userToDTO(user) : null;
}
