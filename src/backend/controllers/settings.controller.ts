import * as settingsService from "../services/settings.service";
import { ForbiddenError } from "../types/errors";
import type { ControllerInput } from "../types";
import type { SettingsDTO } from "../models/settings.model";
import type { UpdateSettingsInput } from "../validation/settings.schema";

export async function get(): Promise<SettingsDTO> {
  return settingsService.getSettings();
}

export async function update({
  input,
  context,
}: ControllerInput<UpdateSettingsInput>): Promise<SettingsDTO> {
  if (context?.role !== "admin") {
    throw new ForbiddenError("Admin access required");
  }
  return settingsService.updateSettings(input, {
    userId: context?.userId,
    role: context?.role,
  });
}
