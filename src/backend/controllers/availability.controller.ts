import * as availabilityService from "../services/availability.service";
import type {
  ControllerInput,
  AvailableSlotDTO,
  ServiceSlotDTO,
} from "../types";
import type {
  FirstAvailableAcrossTherapistsInput,
  ListAvailableSlotsInput,
  SlotsByServiceInput,
} from "../validation/availability.schema";

export async function list({
  input,
}: ControllerInput<ListAvailableSlotsInput>): Promise<AvailableSlotDTO[]> {
  return availabilityService.getAvailableSlots(input);
}

export async function firstAvailable({
  input,
}: ControllerInput<FirstAvailableAcrossTherapistsInput>): Promise<AvailableSlotDTO | null> {
  return availabilityService.getFirstAvailableAcrossTherapists(input);
}

export async function slotsByService({
  input,
}: ControllerInput<SlotsByServiceInput>): Promise<ServiceSlotDTO[]> {
  return availabilityService.getSlotsByService(input);
}
