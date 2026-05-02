/**
 * Test helpers - load env, point at a dedicated test DB, and provide a
 * helper that resets all collections between tests.
 */

import { config as loadEnv } from "dotenv";

// Load .env.local first; .env as fallback. Then override the DB name so
// tests never touch the dev/prod DB.
loadEnv({ path: ".env.local" });
loadEnv();

const baseUri =
  process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27021/virtual-touch";
// Swap the path component to the test DB.
const url = new URL(baseUri.replace("mongodb://", "http://").replace("mongodb+srv://", "https://"));
url.pathname = "/virtual-touch-test";
const protocol = baseUri.startsWith("mongodb+srv://") ? "mongodb+srv://" : "mongodb://";
const testUri = protocol + url.host + url.pathname + url.search;
process.env.MONGODB_URI = testUri;
process.env.JWT_SECRET = process.env.JWT_SECRET ?? "test-jwt-secret";

import type { Model } from "mongoose";
import { connectDB, disconnectDB } from "../db/connection";
import {
  AuditLogModel,
  BookingHoldModel,
  BookingModel,
  ServiceModel,
  SettingsModel,
  TherapistModel,
  TherapistServiceModel,
  TimeOffModel,
  UserModel,
  WorkingHoursModel,
} from "../models";

export { connectDB, disconnectDB };

// Typed as `Model<unknown>[]` so TS doesn't try to take the *intersection*
// of the per-model query overloads (which it can't compose into a single
// callable signature).
const ALL_MODELS: Model<unknown>[] = [
  AuditLogModel as unknown as Model<unknown>,
  BookingHoldModel as unknown as Model<unknown>,
  BookingModel as unknown as Model<unknown>,
  ServiceModel as unknown as Model<unknown>,
  SettingsModel as unknown as Model<unknown>,
  TherapistModel as unknown as Model<unknown>,
  TherapistServiceModel as unknown as Model<unknown>,
  TimeOffModel as unknown as Model<unknown>,
  UserModel as unknown as Model<unknown>,
  WorkingHoursModel as unknown as Model<unknown>,
];

export async function resetDb(): Promise<void> {
  await connectDB();
  for (const M of ALL_MODELS) {
    await M.deleteMany({}).exec();
  }
}

/**
 * Force-create indexes (TTL, unique, compound) - needed because Mongoose's
 * default index creation is async and may race with the first test.
 */
export async function ensureIndexes(): Promise<void> {
  await connectDB();
  for (const M of ALL_MODELS) {
    await M.syncIndexes();
  }
}
