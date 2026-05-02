import { connectDB } from "../db/connection";
import { SettingsModel, settingsToDTO, type SettingsDTO } from "../models/settings.model";
import {
  updateSettingsSchema,
  type UpdateSettingsInput,
} from "../validation/settings.schema";
import { record as recordAudit } from "./audit.service";

type AuditCtx = { userId?: string; role?: "admin" | "worker" | "system" };

const DEFAULTS = {
  defaultOpenTime: "09:00",
  defaultCloseTime: "17:00",
  defaultDaysOpen: [1, 2, 3, 4, 5],
  slotIntervalMin: 30,
  bufferMin: 15,
  cancellationPolicy: "Cancellations within 24 hours may incur a fee.",
  smsNotificationsEnabled: true,
  emailNotificationsEnabled: true,
  intakeRequired: true,
  autoApproveWorkerTimeOff: false,
  businessName: "Vital Touch Massage",
  businessPhone: "+17802038188",
  businessAddress: "11324 182 St NW #100, Edmonton, AB T5S 2X8",
  businessTimezone: "America/Edmonton",
};

/**
 * Get the singleton settings doc, creating it with defaults on first call.
 * All callers (availability, bookings, email/sms toggles) go through here.
 */
export async function getSettings(): Promise<SettingsDTO> {
  await connectDB();
  let settings = await SettingsModel.findOne().exec();
  if (!settings) {
    settings = await SettingsModel.create(DEFAULTS);
  }
  return settingsToDTO(settings);
}

/** Update one or more fields on the singleton. Admin-only at the controller layer. */
export async function updateSettings(
  input: UpdateSettingsInput,
  context?: AuditCtx,
): Promise<SettingsDTO> {
  const parsed = updateSettingsSchema.parse(input);
  await connectDB();
  const before = await SettingsModel.findOne().exec();
  const beforeDto = before ? settingsToDTO(before) : null;
  const updated = await SettingsModel.findOneAndUpdate(
    {},
    { $set: parsed },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  ).exec();
  const afterDto = settingsToDTO(updated!);
  await recordAudit({
    actorId: context?.userId,
    actorRole: context?.role ?? "system",
    action: "settings.update",
    entityType: "Settings",
    entityId: afterDto.id,
    before: beforeDto,
    after: afterDto,
  });
  return afterDto;
}

/** Used by the seed script to ensure defaults exist without overwriting. */
export async function ensureSettings(): Promise<SettingsDTO> {
  return getSettings();
}
