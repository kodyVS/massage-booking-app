import * as holdsService from "../services/holds.service";
import type { ControllerInput } from "../types";
import type { BookingHoldDTO } from "../models/bookingHold.model";
import type { CreateHoldInput, ReleaseHoldInput } from "../validation/holds.schema";

export async function create({
  input,
}: ControllerInput<CreateHoldInput>): Promise<BookingHoldDTO> {
  return holdsService.createHold(input);
}

export async function release({
  input,
}: ControllerInput<ReleaseHoldInput>): Promise<{ ok: true }> {
  await holdsService.releaseHold(input);
  return { ok: true };
}
