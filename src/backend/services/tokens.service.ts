import jwt from "jsonwebtoken";
import { ValidationError } from "../types/errors";

interface ManageTokenPayload {
  bookingId: string;
  /** Discriminator — `manage` for booking management, `intake` for intake forms. */
  kind: "manage" | "intake";
}

function getSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET env var is not set");
  }
  return secret;
}

/**
 * Sign a long-lived booking management token. The token is embedded in the
 * "Manage your booking" magic link emailed to the customer. It does not
 * expire — the server checks the booking is still active when it's used.
 */
export function generateManageToken(bookingId: string): string {
  return jwt.sign(
    { bookingId, kind: "manage" } satisfies ManageTokenPayload,
    getSecret(),
  );
}

/** Sign an intake-form token (same shape, different `kind`). */
export function generateIntakeToken(bookingId: string): string {
  return jwt.sign(
    { bookingId, kind: "intake" } satisfies ManageTokenPayload,
    getSecret(),
  );
}

export function verifyManageToken(token: string): { bookingId: string } {
  const payload = decode(token, "manage");
  return { bookingId: payload.bookingId };
}

export function verifyIntakeToken(token: string): { bookingId: string } {
  const payload = decode(token, "intake");
  return { bookingId: payload.bookingId };
}

function decode(token: string, kind: "manage" | "intake"): ManageTokenPayload {
  let payload: jwt.JwtPayload | string;
  try {
    payload = jwt.verify(token, getSecret());
  } catch {
    throw new ValidationError("Invalid or expired token");
  }
  if (
    typeof payload === "string" ||
    !payload ||
    typeof payload.bookingId !== "string" ||
    payload.kind !== kind
  ) {
    throw new ValidationError("Invalid token payload");
  }
  return payload as ManageTokenPayload;
}
