/**
 * Ensure every Mongoose model's indexes exist in MongoDB.
 *
 * Run after deploying schema changes (or once during initial Atlas setup):
 *
 *   npx tsx scripts/ensure-indexes.ts
 *
 * Mongoose's autoIndex defaults to `true` in dev but should be off in
 * production for performance - this script is the explicit, opt-in path.
 *
 * Safe to re-run: `createIndexes()` is idempotent. Existing indexes are
 * preserved; missing ones are added; conflicting definitions throw.
 *
 * NOTE: this script imports directly from `src/backend/models/*` because
 * indexes are a model-layer concern (not a service-layer concern). The
 * eslint boundary rule explicitly allows `scripts/` to do so - see
 * `eslint.config.mjs` (`boundaries/include` is scoped to `src/**`).
 */
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.prod" });
loadEnv();

import { connectDB, disconnectDB } from "@/backend/db/connection";
import {
  AuditLogModel,
  BookingHoldModel,
  BookingModel,
  CustomerNoteModel,
  ServiceModel,
  SettingsModel,
  TherapistModel,
  TherapistServiceModel,
  TimeOffModel,
  UserModel,
  WorkingHoursModel,
} from "@/backend/models";

const MODELS = [
  ["AuditLog", AuditLogModel],
  ["Booking", BookingModel],
  ["BookingHold", BookingHoldModel],
  ["CustomerNote", CustomerNoteModel],
  ["Service", ServiceModel],
  ["Settings", SettingsModel],
  ["Therapist", TherapistModel],
  ["TherapistService", TherapistServiceModel],
  ["TimeOff", TimeOffModel],
  ["User", UserModel],
  ["WorkingHours", WorkingHoursModel],
] as const;

async function main(): Promise<void> {
  await connectDB();
  console.info("[ensure-indexes] connected - building indexes…");

  let failed = 0;
  for (const [name, model] of MODELS) {
    try {
      await model.createIndexes();
      console.info(`[ensure-indexes]   ${name}: ok`);
    } catch (err) {
      failed += 1;
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[ensure-indexes]   ${name}: ${msg}`);
    }
  }

  await disconnectDB();
  if (failed > 0) {
    console.error(`[ensure-indexes] ${failed} model(s) failed.`);
    process.exit(1);
  }
  console.info("[ensure-indexes] done.");
}

main().catch(async (err) => {
  console.error("[ensure-indexes] fatal:", err);
  await disconnectDB().catch(() => {});
  process.exit(1);
});
