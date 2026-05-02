import { test, before, after, beforeEach } from "node:test";
import { strict as assert } from "node:assert";
import {
  connectDB,
  disconnectDB,
  ensureIndexes,
  resetDb,
} from "./_helpers";
import {
  BookingHoldModel,
  ServiceModel,
  TherapistModel,
  TherapistServiceModel,
} from "../models";
import { createHold } from "../services/holds.service";

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
  const therapist = await TherapistModel.create({
    name: "TTL Test Therapist",
    active: true,
    specialties: [],
  });
  therapistId = therapist._id.toString();

  const service = await ServiceModel.create({
    name: "TTL Test",
    durationMin: 60,
    price: 100,
    active: true,
  });
  serviceId = service._id.toString();

  await TherapistServiceModel.create({
    therapistId: therapist._id,
    serviceId: service._id,
  });
});

test("BookingHold expiresAt index exists with TTL semantics", async () => {
  const indexes = await BookingHoldModel.collection.indexInformation({
    full: true,
  });
  const ttlIndex = (indexes as Array<{ key: Record<string, number>; expireAfterSeconds?: number }>).find(
    (i) => i.key.expiresAt === 1,
  );
  assert.ok(ttlIndex, "expiresAt index must exist");
  assert.equal(
    ttlIndex.expireAfterSeconds,
    0,
    "TTL must be 0 (delete when expiresAt is reached)",
  );
});

test("Mongo TTL monitor expires a past hold", async () => {
  const futureSlot = new Date(Date.now() + 14 * 86_400_000);
  await createHold(
    {
      therapistId,
      serviceId,
      startAt: futureSlot.toISOString(),
      sessionId: "session-ttl-test",
    },
    1, // 1-minute TTL is irrelevant here; we'll directly poke expiresAt
  );

  // Force the hold to be already expired.
  await BookingHoldModel.updateMany({}, { $set: { expiresAt: new Date(Date.now() - 1000) } }).exec();

  const before = await BookingHoldModel.countDocuments();
  assert.equal(before, 1, "hold present before TTL sweep");

  // Mongo's TTL monitor runs ~every 60s. Wait up to 90s for it to fire.
  const deadline = Date.now() + 90_000;
  let remaining = before;
  while (Date.now() < deadline) {
    remaining = await BookingHoldModel.countDocuments();
    if (remaining === 0) break;
    await new Promise((r) => setTimeout(r, 5_000));
  }

  assert.equal(remaining, 0, "TTL monitor should have removed the expired hold");
});
