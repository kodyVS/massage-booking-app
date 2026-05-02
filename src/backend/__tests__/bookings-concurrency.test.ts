import { test, before, after, beforeEach } from "node:test";
import { strict as assert } from "node:assert";
import {
  connectDB,
  disconnectDB,
  ensureIndexes,
  resetDb,
} from "./_helpers";
import {
  BookingModel,
  ServiceModel,
  TherapistModel,
  TherapistServiceModel,
  WorkingHoursModel,
} from "../models";
import { createBooking } from "../services/bookings.service";
import { ensureSettings, updateSettings } from "../services/settings.service";
import { ConflictError } from "../types/errors";

let therapistId: string;
let serviceId: string;
let slotStart: string;

before(async () => {
  await connectDB();
  await ensureIndexes();
});

after(async () => {
  await disconnectDB();
});

beforeEach(async () => {
  await resetDb();
  await ensureSettings();
  await updateSettings({
    slotIntervalMin: 30,
    bufferMin: 0,
    defaultOpenTime: "09:00",
    defaultCloseTime: "17:00",
    defaultDaysOpen: [0, 1, 2, 3, 4, 5, 6],
    businessTimezone: "UTC",
  });

  const therapist = await TherapistModel.create({
    name: "Concurrency Test",
    active: true,
    specialties: [],
  });
  therapistId = therapist._id.toString();

  const service = await ServiceModel.create({
    name: "Concurrency Massage",
    durationMin: 60,
    price: 100,
    active: true,
  });
  serviceId = service._id.toString();

  await TherapistServiceModel.create({
    therapistId: therapist._id,
    serviceId: service._id,
  });

  for (let d = 0; d < 7; d++) {
    await WorkingHoursModel.create({
      therapistId: therapist._id,
      dayOfWeek: d,
      startTime: "09:00",
      endTime: "17:00",
    });
  }

  // Use a future slot so "now" filtering doesn't matter.
  const future = new Date(Date.now() + 14 * 86_400_000);
  future.setUTCHours(10, 0, 0, 0);
  slotStart = future.toISOString();
});

test("two simultaneous bookings on the same slot — exactly one wins", async () => {
  const input = {
    therapistId,
    serviceId,
    startAt: slotStart,
    customerName: "Customer",
    customerEmail: "customer@test.com",
    customerPhone: "5555550000",
  };

  const results = await Promise.allSettled([
    createBooking({ ...input, customerName: "First" }),
    createBooking({ ...input, customerName: "Second" }),
  ]);

  const fulfilled = results.filter((r) => r.status === "fulfilled");
  const rejected = results.filter((r) => r.status === "rejected");

  assert.equal(fulfilled.length, 1, "exactly one booking should succeed");
  assert.equal(rejected.length, 1, "exactly one booking should fail");
  assert.ok(
    (rejected[0] as PromiseRejectedResult).reason instanceof ConflictError,
    "rejection should be a ConflictError",
  );

  const stored = await BookingModel.find({
    status: { $in: ["pending", "confirmed"] },
  })
    .lean()
    .exec();
  assert.equal(stored.length, 1, "only one booking should remain in the DB");
});

test("a sequential second booking on the same slot fails fast", async () => {
  const input = {
    therapistId,
    serviceId,
    startAt: slotStart,
    customerName: "First",
    customerEmail: "customer@test.com",
    customerPhone: "5555550000",
  };
  await createBooking(input);
  await assert.rejects(
    () => createBooking({ ...input, customerName: "Second" }),
    ConflictError,
  );
});
