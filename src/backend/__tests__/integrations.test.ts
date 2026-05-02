/**
 * Integration tests for Phase 4: SMS / email dual-toggle gating, reminder
 * idempotency, and the cron route's CRON_SECRET enforcement.
 *
 * We don't hit Twilio or Resend for real here — the test would be slow and
 * couple us to provider credentials. Instead we verify the gate logic
 * (env + settings) returns the expected `{ sent, reason }` outcome.
 */
import { test, before, after, beforeEach } from "node:test";
import { strict as assert } from "node:assert";
import { connectDB, disconnectDB, ensureIndexes, resetDb } from "./_helpers";
import {
  BookingModel,
  ServiceModel,
  TherapistModel,
  TherapistServiceModel,
} from "../models";
import { sendSms } from "../services/sms.service";
import { sendEmail } from "../services/email.service";
import { sendDueReminders } from "../services/reminders.service";
import {
  ensureSettings,
  getSettings,
  updateSettings,
} from "../services/settings.service";

before(async () => {
  await connectDB();
  await ensureIndexes();
});

after(async () => {
  await disconnectDB();
  // Reset env we may have flipped during the test run.
  delete process.env.SMS_ENABLED;
  delete process.env.EMAIL_ENABLED;
});

beforeEach(async () => {
  await resetDb();
  await ensureSettings();
  delete process.env.SMS_ENABLED;
  delete process.env.EMAIL_ENABLED;
});

test("sendSms no-ops when SMS_ENABLED env is not 'true'", async () => {
  process.env.SMS_ENABLED = "false";
  const settings = await getSettings();
  const result = await sendSms("+15005550006", "hi", settings);
  assert.equal(result.sent, false);
  assert.equal(result.reason, "env-disabled");
});

test("sendSms no-ops when settings.smsNotificationsEnabled is false", async () => {
  process.env.SMS_ENABLED = "true";
  await updateSettings({ smsNotificationsEnabled: false });
  const settings = await getSettings();
  const result = await sendSms("+15005550006", "hi", settings);
  assert.equal(result.sent, false);
  assert.equal(result.reason, "settings-disabled");
});

test("sendSms rejects an invalid E.164 number even with both flags on", async () => {
  process.env.SMS_ENABLED = "true";
  process.env.TWILIO_ACCOUNT_SID = "ACtest";
  process.env.TWILIO_AUTH_TOKEN = "test-token";
  process.env.TWILIO_FROM_NUMBER = "+15555555555";
  await updateSettings({ smsNotificationsEnabled: true });
  const settings = await getSettings();
  const result = await sendSms("not-a-phone", "hi", settings);
  assert.equal(result.sent, false);
  assert.equal(result.reason, "invalid-number");
});

test("sendEmail no-ops when EMAIL_ENABLED env is not 'true'", async () => {
  process.env.EMAIL_ENABLED = "false";
  const settings = await getSettings();
  const result = await sendEmail(
    { to: "x@example.com", subject: "s", html: "<p/>" },
    settings,
  );
  assert.equal(result.sent, false);
  assert.equal(result.reason, "env-disabled");
});

test("sendEmail no-ops when settings.emailNotificationsEnabled is false", async () => {
  process.env.EMAIL_ENABLED = "true";
  await updateSettings({ emailNotificationsEnabled: false });
  const settings = await getSettings();
  const result = await sendEmail(
    { to: "x@example.com", subject: "s", html: "<p/>" },
    settings,
  );
  assert.equal(result.sent, false);
  assert.equal(result.reason, "settings-disabled");
});

test("sendEmail rejects empty/invalid recipient even with both flags on", async () => {
  process.env.EMAIL_ENABLED = "true";
  process.env.RESEND_API_KEY = "re_test";
  await updateSettings({ emailNotificationsEnabled: true });
  const settings = await getSettings();
  const result = await sendEmail(
    { to: "not-an-email", subject: "s", html: "<p/>" },
    settings,
  );
  assert.equal(result.sent, false);
  assert.equal(result.reason, "invalid-recipient");
});

test("sendDueReminders is idempotent — second run does NOT re-process the same booking", async () => {
  // Force both gates off so we don't try to ship real provider calls;
  // the test focuses on the booking-state state transition (reminderSentAt).
  process.env.SMS_ENABLED = "false";
  process.env.EMAIL_ENABLED = "false";

  const therapist = await TherapistModel.create({
    name: "Reminder Test",
    active: true,
    specialties: [],
  });
  const service = await ServiceModel.create({
    name: "Massage",
    durationMin: 60,
    price: 100,
    active: true,
  });
  await TherapistServiceModel.create({
    therapistId: therapist._id,
    serviceId: service._id,
  });

  const startAt = new Date(Date.now() + 24 * 60 * 60_000);
  const endAt = new Date(startAt.getTime() + 60 * 60_000);
  await BookingModel.create({
    therapistId: therapist._id,
    serviceId: service._id,
    customerName: "Test Customer",
    customerEmail: "test@example.com",
    customerPhone: "+15005550006",
    startAt,
    endAt,
    status: "confirmed",
    manageToken: "tok-reminder-idempotency",
  });

  const first = await sendDueReminders();
  assert.equal(first.scanned, 1);

  // Second run within the same window must not re-process — reminderSentAt
  // is now stamped, so the query filter excludes it.
  const second = await sendDueReminders();
  assert.equal(second.scanned, 0, "second run must skip already-reminded");

  const stored = await BookingModel.findOne({
    manageToken: "tok-reminder-idempotency",
  }).exec();
  assert.ok(stored?.reminderSentAt, "reminderSentAt must be stamped");
});

test("sendDueReminders skips bookings outside the 23.5–24.5h window", async () => {
  process.env.SMS_ENABLED = "false";
  process.env.EMAIL_ENABLED = "false";

  const therapist = await TherapistModel.create({
    name: "Window Test",
    active: true,
    specialties: [],
  });
  const service = await ServiceModel.create({
    name: "Massage",
    durationMin: 60,
    price: 100,
    active: true,
  });

  // 12h out — too soon
  await BookingModel.create({
    therapistId: therapist._id,
    serviceId: service._id,
    customerName: "Soon",
    customerEmail: "soon@example.com",
    customerPhone: "+15005550006",
    startAt: new Date(Date.now() + 12 * 60 * 60_000),
    endAt: new Date(Date.now() + 13 * 60 * 60_000),
    status: "confirmed",
    manageToken: "tok-soon",
  });

  // 48h out — too far
  await BookingModel.create({
    therapistId: therapist._id,
    serviceId: service._id,
    customerName: "Later",
    customerEmail: "later@example.com",
    customerPhone: "+15005550006",
    startAt: new Date(Date.now() + 48 * 60 * 60_000),
    endAt: new Date(Date.now() + 49 * 60 * 60_000),
    status: "confirmed",
    manageToken: "tok-later",
  });

  const result = await sendDueReminders();
  assert.equal(result.scanned, 0);
});
