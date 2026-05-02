import { test, before, after, beforeEach } from "node:test";
import { strict as assert } from "node:assert";
import { connectDB, disconnectDB, ensureIndexes, resetDb } from "./_helpers";
import {
  ServiceModel,
  TherapistModel,
  TherapistServiceModel,
  WorkingHoursModel,
  BookingModel,
} from "../models";
import { getAvailableSlots } from "../services/availability.service";
import { ensureSettings, updateSettings } from "../services/settings.service";

let therapistId: string;
let serviceId: string;

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
  // Pin slot interval and buffer to deterministic values.
  await updateSettings({
    slotIntervalMin: 30,
    bufferMin: 0,
    defaultOpenTime: "09:00",
    defaultCloseTime: "17:00",
    defaultDaysOpen: [0, 1, 2, 3, 4, 5, 6],
    businessTimezone: "UTC",
  });

  const therapist = await TherapistModel.create({
    name: "Test Therapist",
    active: true,
    specialties: [],
  });
  therapistId = therapist._id.toString();

  const service = await ServiceModel.create({
    name: "Massage 60",
    durationMin: 60,
    price: 100,
    active: true,
  });
  serviceId = service._id.toString();

  await TherapistServiceModel.create({
    therapistId: therapist._id,
    serviceId: service._id,
  });

  // Working hours: 09:00–17:00 every day.
  for (let d = 0; d < 7; d++) {
    await WorkingHoursModel.create({
      therapistId: therapist._id,
      dayOfWeek: d,
      startTime: "09:00",
      endTime: "17:00",
    });
  }
});

// Choose a date well in the future so "now" filtering doesn't drop slots.
const TEST_DATE = futureDate(30);

test("generates correct slots for an empty day (60-min service, 30-min interval, 9–5)", async () => {
  const slots = await getAvailableSlots({
    therapistId,
    serviceId,
    date: TEST_DATE,
  });
  // 09:00 → 16:00 starts (last that fits 60min before 17:00), every 30 min
  // = 15 slots.
  assert.equal(slots.length, 15);
  assert.equal(slots[0].startAt, `${TEST_DATE}T09:00:00.000Z`);
  assert.equal(slots[0].endAt, `${TEST_DATE}T10:00:00.000Z`);
  assert.equal(slots[slots.length - 1].startAt, `${TEST_DATE}T16:00:00.000Z`);
});

test("excludes slots that overlap an existing booking", async () => {
  await BookingModel.create({
    therapistId,
    serviceId,
    customerName: "X",
    customerEmail: "x@test.com",
    customerPhone: "5555550000",
    startAt: new Date(`${TEST_DATE}T11:00:00.000Z`),
    endAt: new Date(`${TEST_DATE}T12:00:00.000Z`),
    status: "confirmed",
    manageToken: "token-existing-1",
  });

  const slots = await getAvailableSlots({
    therapistId,
    serviceId,
    date: TEST_DATE,
  });
  const starts = slots.map((s) => s.startAt);
  // 10:30 (10:30-11:30 overlaps), 11:00 (overlaps), 11:30 (overlaps)
  // should be missing.
  assert.ok(!starts.includes(`${TEST_DATE}T10:30:00.000Z`));
  assert.ok(!starts.includes(`${TEST_DATE}T11:00:00.000Z`));
  assert.ok(!starts.includes(`${TEST_DATE}T11:30:00.000Z`));
  // 10:00 ends at 11:00 - fine.
  assert.ok(starts.includes(`${TEST_DATE}T10:00:00.000Z`));
  // 12:00 starts when booking ends - fine (no buffer).
  assert.ok(starts.includes(`${TEST_DATE}T12:00:00.000Z`));
});

test("respects the buffer between bookings", async () => {
  await updateSettings({ bufferMin: 30 });
  await BookingModel.create({
    therapistId,
    serviceId,
    customerName: "X",
    customerEmail: "x@test.com",
    customerPhone: "5555550000",
    startAt: new Date(`${TEST_DATE}T11:00:00.000Z`),
    endAt: new Date(`${TEST_DATE}T12:00:00.000Z`),
    status: "confirmed",
    manageToken: "token-existing-2",
  });

  const slots = await getAvailableSlots({
    therapistId,
    serviceId,
    date: TEST_DATE,
  });
  const starts = slots.map((s) => s.startAt);
  // With 30 min buffer, the booking blocks 10:30 → 12:30. So 12:00 (which
  // ends at 13:00) is *not* allowed because it overlaps the buffer.
  assert.ok(!starts.includes(`${TEST_DATE}T12:00:00.000Z`));
  // 12:30 (ends 13:30) is allowed.
  assert.ok(starts.includes(`${TEST_DATE}T12:30:00.000Z`));
});

test("returns no slots when therapist doesn't offer the service", async () => {
  await TherapistServiceModel.deleteMany({});
  const slots = await getAvailableSlots({
    therapistId,
    serviceId,
    date: TEST_DATE,
  });
  assert.equal(slots.length, 0);
});

test("returns no slots when therapist is inactive", async () => {
  await TherapistModel.updateOne(
    { _id: therapistId },
    { $set: { active: false } },
  );
  const slots = await getAvailableSlots({
    therapistId,
    serviceId,
    date: TEST_DATE,
  });
  assert.equal(slots.length, 0);
});

function futureDate(daysAhead: number): string {
  const d = new Date(Date.now() + daysAhead * 86_400_000);
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}
