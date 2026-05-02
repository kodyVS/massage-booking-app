/**
 * Idempotent seed script. Run with `npm run seed` (which uses tsx).
 *
 * Phase 6 rebrand (Vital Touch):
 *   - 1 admin user (admin@vitaltouch.com / Admin123!)
 *   - 4 services: Relaxation Massage, Deep Tissue, Thai Massage, Stress Relief
 *   - 2 therapists: Luna Tanaka, Kira Nakamura
 *   - 1 worker user per therapist (Worker123!)
 *   - Working hours: Mon–Fri 9–5 + Sat 10–4 (richer demo data so weekends
 *     don't render an empty slot list)
 *   - All therapists offer all 4 services
 *
 * Idempotency: this script reconciles the catalog. Stale entities from a
 * previous catalog (Phase 1's `Maya Chen` / `Sports Massage` / etc.) are
 * deactivated rather than hard-deleted so historical bookings remain
 * resolvable. Working-hours rows for stale therapists are removed because
 * they have no bookings on the dev DB and would clutter the schedule view.
 *
 * Re-running the script after the catalog reconciliation is a no-op; counts
 * stay stable.
 */

// Load env from .env.local (Next.js does this implicitly at runtime; tsx does not).
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });
loadEnv(); // fall back to .env if .env.local is absent

import { Types } from "mongoose";
import { connectDB, disconnectDB } from "@/backend/db/connection";
import { hashPassword } from "@/backend/services/auth.service";
import { ensureSettings } from "@/backend/services/settings.service";
import {
  BookingModel,
  ServiceModel,
  SettingsModel,
  TherapistModel,
  TherapistServiceModel,
  UserModel,
  WorkingHoursModel,
} from "@/backend/models";
import { fromZonedTime, formatInTimeZone } from "date-fns-tz";

const ADMIN_EMAIL = "admin@vitaltouch.com";
const ADMIN_PASSWORD = "Admin123!";

const SERVICES = [
  {
    name: "Relaxation Massage",
    description:
      "Long, flowing Swedish-style strokes for full-body unwinding. Our most popular for first-time visitors.",
    durationMin: 60,
    price: 95,
  },
  {
    name: "Deep Tissue",
    description:
      "Targeted, slower work that releases chronic muscle tension and adhesions in the deeper layers.",
    durationMin: 60,
    price: 115,
  },
  {
    name: "Thai Massage",
    description:
      "Assisted stretching and rhythmic compressions on a comfortable mat — performed clothed, restorative for tight hips and shoulders.",
    durationMin: 90,
    price: 135,
  },
  {
    name: "Stress Relief",
    description:
      "Calming pressure on the neck, shoulders, scalp, and feet to help unclench from the week. Great after long travel.",
    durationMin: 60,
    price: 95,
  },
] as const;

const THERAPISTS = [
  {
    name: "Luna Tanaka",
    workerEmail: "luna@vitaltouch.com",
    bio: "LMT with seven years of practice in relaxation, Thai, and stress-relief work. Studied breathwork in Kyoto and brings a calm, measured pace to every session.",
    specialties: ["Relaxation", "Thai", "Stress Relief"],
    licenseNumber: "MT-2018-0214",
    yearsExperience: 7,
  },
  {
    name: "Kira Nakamura",
    workerEmail: "kira@vitaltouch.com",
    bio: "Deep-tissue and Thai specialist who balances therapeutic depth with restorative pacing. Eight years of clinical experience focused on chronic shoulder and lower-back tension.",
    specialties: ["Deep Tissue", "Thai", "Stress Relief"],
    licenseNumber: "MT-2017-0871",
    yearsExperience: 8,
  },
] as const;

const WORKER_PASSWORD = "Worker123!";
// Mon–Fri 9–5, Sat 10–4, Sun 11–3.
const WEEKDAY_HOURS: ReadonlyArray<{ dayOfWeek: number; startTime: string; endTime: string }> =
  [
    { dayOfWeek: 0, startTime: "11:00", endTime: "15:00" },
    { dayOfWeek: 1, startTime: "09:00", endTime: "17:00" },
    { dayOfWeek: 2, startTime: "09:00", endTime: "17:00" },
    { dayOfWeek: 3, startTime: "09:00", endTime: "17:00" },
    { dayOfWeek: 4, startTime: "09:00", endTime: "17:00" },
    { dayOfWeek: 5, startTime: "09:00", endTime: "17:00" },
    { dayOfWeek: 6, startTime: "10:00", endTime: "16:00" },
  ];

async function main() {
  console.log("[seed] connecting to MongoDB…");
  await connectDB();

  // 1. Settings singleton — ensure default exists, then force brand + contact.
  await ensureSettings();
  await SettingsModel.updateOne(
    {},
    {
      $set: {
        businessName: "Vital Touch Massage",
        businessPhone: "+17802038188",
        businessAddress: "11324 182 St NW #100, Edmonton, AB T5S 2X8",
        businessTimezone: "America/Edmonton",
        slotIntervalMin: 30,
      },
    },
  ).exec();
  console.log("[seed] settings ready (Vital Touch Massage, Edmonton AB)");

  // 2. Admin user
  const adminHash = await hashPassword(ADMIN_PASSWORD);
  await UserModel.updateOne(
    { email: ADMIN_EMAIL },
    {
      $setOnInsert: {
        email: ADMIN_EMAIL,
        passwordHash: adminHash,
        role: "admin",
        active: true,
      },
    },
    { upsert: true },
  );
  console.log(`[seed] admin user: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);

  // 2b. Deactivate any stale admin from the previous catalog (virtualtouch.com)
  // so they can't log in but historical audit refs still resolve.
  await UserModel.updateMany(
    {
      email: { $regex: /@virtualtouch\.com$/ },
      role: "admin",
    },
    { $set: { active: false } },
  ).exec();

  // 3. Services — upsert by name. Update durationMin/price/description if the
  // service already exists (so re-seeding picks up catalog changes), but
  // preserve `active` so admins can deactivate without the seed flipping
  // them back.
  const serviceDocs = await Promise.all(
    SERVICES.map(async (svc) => {
      const doc = await ServiceModel.findOneAndUpdate(
        { name: svc.name },
        {
          $set: {
            description: svc.description,
            durationMin: svc.durationMin,
            price: svc.price,
          },
          $setOnInsert: { name: svc.name, active: true },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      ).exec();
      return doc;
    }),
  );
  console.log(`[seed] services: ${serviceDocs.map((s) => s.name).join(", ")}`);

  // 3b. Deactivate any service NOT in our current catalog (Phase 1's
  // Sports/Couples/Reflexology). Keep them in the DB so any historical
  // booking still resolves.
  const currentServiceIds = serviceDocs.map((s) => s._id);
  await ServiceModel.updateMany(
    { _id: { $nin: currentServiceIds } },
    { $set: { active: false } },
  ).exec();

  // 4. Therapists — upsert by name; refresh bio/specialties so re-seeding
  // picks up edits.
  const workerHash = await hashPassword(WORKER_PASSWORD);
  const currentTherapistIds: Types.ObjectId[] = [];
  for (const t of THERAPISTS) {
    const therapist = await TherapistModel.findOneAndUpdate(
      { name: t.name },
      {
        $set: {
          bio: t.bio,
          specialties: [...t.specialties],
          licenseNumber: t.licenseNumber,
          yearsExperience: t.yearsExperience,
          active: true,
        },
        $setOnInsert: { name: t.name },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    ).exec();

    currentTherapistIds.push(therapist._id);

    // Worker user linked to this therapist
    await UserModel.updateOne(
      { email: t.workerEmail },
      {
        $set: { active: true, role: "worker", therapistId: therapist._id },
        $setOnInsert: {
          email: t.workerEmail,
          passwordHash: workerHash,
        },
      },
      { upsert: true },
    );

    // Working hours: replace the whole set for this therapist with our
    // canonical Mon–Fri 9–5 + Sat 10–4. Idempotent across re-runs.
    await WorkingHoursModel.deleteMany({ therapistId: therapist._id }).exec();
    await WorkingHoursModel.insertMany(
      WEEKDAY_HOURS.map((h) => ({ therapistId: therapist._id, ...h })),
    );

    // Service links — each therapist offers every active service.
    for (const svc of serviceDocs) {
      const exists = await TherapistServiceModel.exists({
        therapistId: therapist._id,
        serviceId: svc._id,
      });
      if (!exists) {
        await TherapistServiceModel.create({
          therapistId: therapist._id,
          serviceId: svc._id,
        });
      }
    }
  }
  console.log(
    `[seed] therapists + worker users: ${THERAPISTS.map((t) => t.workerEmail).join(", ")}`,
  );
  console.log(`[seed] worker password: ${WORKER_PASSWORD}`);

  // 4b. Deactivate any therapist NOT in our current catalog (Phase 1's
  // Maya/Jordan/Priya). Drop their working-hours rows so the admin schedule
  // grid doesn't render empty columns. Existing booking rows preserved.
  const stale = await TherapistModel.find({
    _id: { $nin: currentTherapistIds },
  })
    .select("_id")
    .lean()
    .exec();
  if (stale.length > 0) {
    const staleIds = stale.map((s) => s._id);
    await TherapistModel.updateMany(
      { _id: { $in: staleIds } },
      { $set: { active: false } },
    ).exec();
    await WorkingHoursModel.deleteMany({
      therapistId: { $in: staleIds },
    }).exec();
    // Deactivate worker users linked to stale therapists.
    await UserModel.updateMany(
      { therapistId: { $in: staleIds } },
      { $set: { active: false } },
    ).exec();
  }

  // 5. Demo bookings on days 2–10 so the slot grid has greyed-out times.
  await seedDemoBookings(currentTherapistIds, serviceDocs);

  console.log(
    "\n[seed] done. ⚠️  Change the seeded admin password before production.",
  );
}

/**
 * Seed a handful of confirmed bookings on days 2–10 from today so the public
 * picker has something to render as "already booked" (greyed-out). Idempotent:
 * we tag every demo booking with `customerEmail = "demo-seed@vitaltouch.com"`
 * and clear those before re-inserting.
 */
async function seedDemoBookings(
  therapistIds: Types.ObjectId[],
  services: Array<{ _id: Types.ObjectId; durationMin: number }>,
): Promise<void> {
  const DEMO_TAG = "demo-seed@vitaltouch.com";
  await BookingModel.deleteMany({ customerEmail: DEMO_TAG }).exec();

  const tz = "America/Edmonton";
  const SLOT_MIN = 30;
  const today = new Date();
  // Deterministic-ish PRNG so the demo set stays stable across reseeds.
  let seed = 2026_05_02;
  const rand = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };

  const created: Array<unknown> = [];
  for (let dayOffset = 2; dayOffset <= 10; dayOffset++) {
    const dateLocal = new Date(today.getTime() + dayOffset * 86_400_000);
    const ymd = formatInTimeZone(dateLocal, tz, "yyyy-MM-dd");
    const dow = Number(formatInTimeZone(dateLocal, tz, "i")) % 7; // 0–6, Sun=0

    // Match seeded working hours.
    let openHour: number;
    let closeHour: number;
    if (dow === 0) [openHour, closeHour] = [11, 15];
    else if (dow === 6) [openHour, closeHour] = [10, 16];
    else [openHour, closeHour] = [9, 17];

    // 2–4 random bookings per therapist per day, chosen from the slot grid.
    for (const therapistId of therapistIds) {
      const count = 2 + Math.floor(rand() * 3);
      const taken = new Set<number>();
      for (let i = 0; i < count; i++) {
        // Snap to a 30-min grid inside working hours, excluding the last hour
        // so a 60-min booking still fits.
        const totalSlots =
          ((closeHour - openHour) * 60) / SLOT_MIN - 2; // leave 60-min runway
        const slotIndex = Math.floor(rand() * totalSlots);
        if (taken.has(slotIndex) || taken.has(slotIndex - 1) || taken.has(slotIndex + 1)) {
          continue; // avoid overlap with another demo booking on this day
        }
        taken.add(slotIndex);
        const minuteOffset = slotIndex * SLOT_MIN;
        const hh = String(openHour + Math.floor(minuteOffset / 60)).padStart(2, "0");
        const mm = String(minuteOffset % 60).padStart(2, "0");
        const startUtc = fromZonedTime(`${ymd}T${hh}:${mm}:00`, tz);
        const svc = services[Math.floor(rand() * services.length)]!;
        const endUtc = new Date(startUtc.getTime() + svc.durationMin * 60_000);
        created.push({
          therapistId,
          serviceId: svc._id,
          customerName: "Demo Seed",
          customerEmail: DEMO_TAG,
          customerPhone: "+15555550100",
          startAt: startUtc,
          endAt: endUtc,
          status: "confirmed",
          manageToken: `demo-${therapistId.toString().slice(-6)}-${dayOffset}-${i}`,
        });
      }
    }
  }
  if (created.length > 0) {
    await BookingModel.insertMany(created);
    console.log(`[seed] demo bookings: ${created.length} placed across days 2–10`);
  }
}

main()
  .then(async () => {
    await disconnectDB();
    process.exit(0);
  })
  .catch(async (err) => {
    console.error("[seed] failed:", err);
    await disconnectDB().catch(() => {});
    process.exit(1);
  });
