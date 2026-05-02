/**
 * Public surface of the backend module.
 *
 * Routes, server actions, and server components import from here ONLY:
 *
 *   import { bookingsController, NotFoundError } from "@/backend";
 *
 * Never reach into `src/backend/services/*` or `src/backend/models/*`
 * from the frontend - the ESLint boundary rules will reject it.
 */

export { connectDB, disconnectDB } from "./db/connection";

export * from "./types";
export * from "./types/errors";

// Phase 1 controllers - every route handler / server action calls into one
// of these. New controllers added in later phases append here.
export * as authController from "./controllers/auth.controller";
export * as availabilityController from "./controllers/availability.controller";
export * as bookingsController from "./controllers/bookings.controller";
export * as cronController from "./controllers/cron.controller";
export * as customersController from "./controllers/customers.controller";
export * as holdsController from "./controllers/holds.controller";
export * as intakeController from "./controllers/intake.controller";
export * as schedulesController from "./controllers/schedules.controller";
export * as servicesController from "./controllers/services.controller";
export * as settingsController from "./controllers/settings.controller";
export * as therapistsController from "./controllers/therapists.controller";
