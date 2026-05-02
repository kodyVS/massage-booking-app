import { Types } from "mongoose";
import { fromZonedTime, toZonedTime } from "date-fns-tz";
import { connectDB } from "../db/connection";
import { BookingModel } from "../models/booking.model";
import { ServiceModel } from "../models/service.model";
import { TherapistModel } from "../models/therapist.model";
import { TherapistServiceModel } from "../models/therapistService.model";
import { WorkingHoursModel } from "../models/workingHours.model";
import { NotFoundError } from "../types/errors";
import type { AvailableSlotDTO, ServiceSlotDTO } from "../types";
import {
  firstAvailableAcrossTherapistsSchema,
  listAvailableSlotsSchema,
  slotsByServiceSchema,
  type FirstAvailableAcrossTherapistsInput,
  type ListAvailableSlotsInput,
  type SlotsByServiceInput,
} from "../validation/availability.schema";
import { getApprovedTimeOffOverlapping } from "./schedules.service";
import { getActiveHoldsOverlapping } from "./holds.service";
import { getSettings } from "./settings.service";

interface Interval {
  startAt: Date;
  endAt: Date;
}

/**
 * All bookable slots for one therapist on one calendar date.
 *
 * Filtering pipeline:
 *   1. Look up therapist's working hours for that day-of-week (or fall back
 *      to settings.defaultOpenTime/CloseTime if no rows exist).
 *   2. Generate candidate slot starts at `slotIntervalMin` increments inside
 *      each working block, requiring `service.durationMin` to fit before the
 *      block ends.
 *   3. Subtract: (a) approved time off, (b) existing pending/confirmed
 *      bookings + buffer, (c) active holds.
 *   4. Drop slots in the past.
 *   5. Return UTC ISO strings — frontend formats in business TZ.
 */
export async function getAvailableSlots(
  input: ListAvailableSlotsInput,
): Promise<AvailableSlotDTO[]> {
  const { therapistId, serviceId, date } = listAvailableSlotsSchema.parse(input);
  await connectDB();

  const [therapist, service, settings] = await Promise.all([
    TherapistModel.findById(therapistId).lean().exec(),
    ServiceModel.findById(serviceId).lean().exec(),
    getSettings(),
  ]);

  if (!therapist || !therapist.active) return [];
  if (!service || !service.active) return [];

  // Confirm therapist is allowed to perform this service.
  const link = await TherapistServiceModel.findOne({
    therapistId: new Types.ObjectId(therapistId),
    serviceId: new Types.ObjectId(serviceId),
  })
    .lean()
    .exec();
  if (!link) return [];

  const tz = settings.businessTimezone;
  // Day boundaries in business TZ → UTC.
  const dayStartLocal = `${date}T00:00:00`;
  const dayEndLocal = `${date}T23:59:59.999`;
  const dayStart = fromZonedTime(dayStartLocal, tz);
  const dayEnd = fromZonedTime(dayEndLocal, tz);

  // Day-of-week from the local interpretation of the date.
  const localMidnight = toZonedTime(dayStart, tz);
  const dayOfWeek = localMidnight.getDay();

  // Working blocks for this day.
  const workingRows = await WorkingHoursModel.find({
    therapistId: new Types.ObjectId(therapistId),
    dayOfWeek,
  })
    .lean()
    .exec();

  let workingBlocks: Interval[];
  if (workingRows.length > 0) {
    workingBlocks = workingRows.map((r) => ({
      startAt: fromZonedTime(`${date}T${r.startTime}:00`, tz),
      endAt: fromZonedTime(`${date}T${r.endTime}:00`, tz),
    }));
  } else if (settings.defaultDaysOpen.includes(dayOfWeek)) {
    workingBlocks = [
      {
        startAt: fromZonedTime(`${date}T${settings.defaultOpenTime}:00`, tz),
        endAt: fromZonedTime(`${date}T${settings.defaultCloseTime}:00`, tz),
      },
    ];
  } else {
    return [];
  }

  // Existing busy intervals.
  const [bookings, timeOff, holds] = await Promise.all([
    BookingModel.find({
      therapistId: new Types.ObjectId(therapistId),
      status: { $in: ["pending", "confirmed"] },
      startAt: { $lt: dayEnd },
      endAt: { $gt: dayStart },
    })
      .select("startAt endAt")
      .lean()
      .exec(),
    getApprovedTimeOffOverlapping(therapistId, dayStart, dayEnd),
    getActiveHoldsOverlapping(therapistId, dayStart, dayEnd),
  ]);

  const buffer = settings.bufferMin * 60_000;
  const busy: Interval[] = [
    ...bookings.map((b) => ({
      // Buffer expands each booking on both sides so adjacent slots aren't
      // bookable.
      startAt: new Date(b.startAt.getTime() - buffer),
      endAt: new Date(b.endAt.getTime() + buffer),
    })),
    ...timeOff,
    ...holds,
  ];

  const interval = settings.slotIntervalMin * 60_000;
  const duration = service.durationMin * 60_000;
  const now = Date.now();

  const slots: AvailableSlotDTO[] = [];
  for (const block of workingBlocks) {
    for (
      let t = block.startAt.getTime();
      t + duration <= block.endAt.getTime();
      t += interval
    ) {
      const startAt = new Date(t);
      const endAt = new Date(t + duration);
      if (startAt.getTime() < now) continue;
      const overlaps = busy.some(
        (b) => b.startAt.getTime() < endAt.getTime() && b.endAt.getTime() > startAt.getTime(),
      );
      if (!overlaps) {
        slots.push({
          therapistId,
          startAt: startAt.toISOString(),
          endAt: endAt.toISOString(),
        });
      }
    }
  }

  return slots;
}

/**
 * Find the earliest available slot for a service across ALL therapists who
 * offer it. Returns the slot + therapist id, or null if nothing is open in
 * the scan window.
 */
export async function getFirstAvailableAcrossTherapists(
  input: FirstAvailableAcrossTherapistsInput,
): Promise<AvailableSlotDTO | null> {
  const { serviceId, fromDate, daysAhead } =
    firstAvailableAcrossTherapistsSchema.parse(input);
  await connectDB();

  const service = await ServiceModel.findById(serviceId).lean().exec();
  if (!service) throw new NotFoundError("Service not found");

  const settings = await getSettings();
  const tz = settings.businessTimezone;

  const links = await TherapistServiceModel.find({
    serviceId: new Types.ObjectId(serviceId),
  })
    .select("therapistId")
    .lean()
    .exec();
  if (links.length === 0) return null;

  const therapistIds = links.map((l) => l.therapistId.toString());

  const start = fromDate
    ? new Date(`${fromDate}T00:00:00.000Z`)
    : new Date();
  let earliest: AvailableSlotDTO | null = null;

  for (let day = 0; day < daysAhead; day++) {
    const dayDate = new Date(start.getTime() + day * 86_400_000);
    // Format YYYY-MM-DD in the business timezone.
    const localDate = toZonedTime(dayDate, tz);
    const yyyy = localDate.getFullYear();
    const mm = String(localDate.getMonth() + 1).padStart(2, "0");
    const dd = String(localDate.getDate()).padStart(2, "0");
    const dateStr = `${yyyy}-${mm}-${dd}`;

    for (const tid of therapistIds) {
      const slots = await getAvailableSlots({
        therapistId: tid,
        serviceId,
        date: dateStr,
      });
      if (slots.length === 0) continue;
      const candidate = slots[0];
      if (!earliest || candidate.startAt < earliest.startAt) {
        earliest = candidate;
      }
    }
    if (earliest) return earliest;
  }

  return earliest;
}

/**
 * Service-first slot lookup. Returns a deduplicated list of bookable start
 * times for `serviceId` on `date`, each annotated with the set of therapists
 * who can take that slot.
 *
 * The frontend renders this as a single time-slot grid (rather than the
 * therapist-first per-therapist grid). When a user picks a slot, they then
 * choose one of the listed therapists.
 *
 * Implementation: fetches `getAvailableSlots` for every therapist linked to
 * the service, then merges by `startAt`. O(therapists × slots-per-day),
 * which is fine for our 2-therapist demo and still cheap up to dozens.
 */
export async function getSlotsByService(
  input: SlotsByServiceInput,
): Promise<ServiceSlotDTO[]> {
  const { serviceId, date } = slotsByServiceSchema.parse(input);
  await connectDB();

  const service = await ServiceModel.findById(serviceId).lean().exec();
  if (!service || !service.active) return [];

  // All therapists who can perform this service.
  const links = await TherapistServiceModel.find({
    serviceId: new Types.ObjectId(serviceId),
  })
    .select("therapistId")
    .lean()
    .exec();
  if (links.length === 0) return [];

  const therapistIds = links.map((l) => l.therapistId.toString());

  // Pull both the candidate grid (all in-working-hours slots, ignoring
  // bookings) AND the free slots (the original filter pipeline). The picker
  // then renders fully-booked slots greyed out instead of hiding them.
  const [candidateLists, freeLists] = await Promise.all([
    Promise.all(
      therapistIds.map((tid) =>
        getCandidateSlots({ therapistId: tid, serviceId, date }),
      ),
    ),
    Promise.all(
      therapistIds.map((tid) =>
        getAvailableSlots({ therapistId: tid, serviceId, date }),
      ),
    ),
  ]);

  // Index "free" by (therapistId|startAt) for O(1) lookup.
  const freeKey = (tid: string, startAt: string) => `${tid}|${startAt}`;
  const freeSet = new Set<string>();
  for (let i = 0; i < therapistIds.length; i++) {
    for (const s of freeLists[i]!) freeSet.add(freeKey(therapistIds[i]!, s.startAt));
  }

  // Union of all candidate startAts (any therapist whose working hours cover
  // this slot contributes). For each, the available therapists are the ones
  // whose freeSet contains the slot.
  const merged = new Map<string, ServiceSlotDTO>();
  for (let i = 0; i < therapistIds.length; i++) {
    const tid = therapistIds[i]!;
    for (const s of candidateLists[i]!) {
      const existing = merged.get(s.startAt);
      const isFree = freeSet.has(freeKey(tid, s.startAt));
      if (existing) {
        if (isFree) existing.therapistIds.push(tid);
      } else {
        merged.set(s.startAt, {
          startAt: s.startAt,
          endAt: s.endAt,
          therapistIds: isFree ? [tid] : [],
        });
      }
    }
  }

  return Array.from(merged.values()).sort((a, b) =>
    a.startAt.localeCompare(b.startAt),
  );
}

/**
 * Internal: all in-working-hours slot starts for a therapist on a date,
 * ignoring conflicts (no booking/hold/time-off subtraction). Used by
 * `getSlotsByService` to render fully-booked slots as greyed-out.
 */
async function getCandidateSlots(
  input: ListAvailableSlotsInput,
): Promise<AvailableSlotDTO[]> {
  const { therapistId, serviceId, date } = listAvailableSlotsSchema.parse(input);
  await connectDB();

  const [therapist, service, settings] = await Promise.all([
    TherapistModel.findById(therapistId).lean().exec(),
    ServiceModel.findById(serviceId).lean().exec(),
    getSettings(),
  ]);
  if (!therapist?.active || !service?.active) return [];

  const link = await TherapistServiceModel.findOne({
    therapistId: new Types.ObjectId(therapistId),
    serviceId: new Types.ObjectId(serviceId),
  })
    .lean()
    .exec();
  if (!link) return [];

  const tz = settings.businessTimezone;
  const dayStartLocal = `${date}T00:00:00`;
  const dayStart = fromZonedTime(dayStartLocal, tz);
  const dayOfWeek = toZonedTime(dayStart, tz).getDay();

  const workingRows = await WorkingHoursModel.find({
    therapistId: new Types.ObjectId(therapistId),
    dayOfWeek,
  })
    .lean()
    .exec();

  let workingBlocks: Interval[];
  if (workingRows.length > 0) {
    workingBlocks = workingRows.map((r) => ({
      startAt: fromZonedTime(`${date}T${r.startTime}:00`, tz),
      endAt: fromZonedTime(`${date}T${r.endTime}:00`, tz),
    }));
  } else if (settings.defaultDaysOpen.includes(dayOfWeek)) {
    workingBlocks = [
      {
        startAt: fromZonedTime(`${date}T${settings.defaultOpenTime}:00`, tz),
        endAt: fromZonedTime(`${date}T${settings.defaultCloseTime}:00`, tz),
      },
    ];
  } else {
    return [];
  }

  const interval = settings.slotIntervalMin * 60_000;
  const duration = service.durationMin * 60_000;
  const now = Date.now();

  const slots: AvailableSlotDTO[] = [];
  for (const block of workingBlocks) {
    for (
      let t = block.startAt.getTime();
      t + duration <= block.endAt.getTime();
      t += interval
    ) {
      if (t < now) continue;
      slots.push({
        therapistId,
        startAt: new Date(t).toISOString(),
        endAt: new Date(t + duration).toISOString(),
      });
    }
  }
  return slots;
}
