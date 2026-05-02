import * as intakeService from "../services/intake.service";
import type { ControllerInput } from "../types";
import type { BookingDTO } from "../models/booking.model";
import type {
  IntakeTokenInput,
  SubmitIntakeInput,
} from "../validation/intake.schema";

export async function getByToken({
  input,
}: ControllerInput<IntakeTokenInput>): Promise<BookingDTO> {
  return intakeService.getByToken(input);
}

export async function submit({
  input,
}: ControllerInput<SubmitIntakeInput>): Promise<BookingDTO> {
  return intakeService.submit(input);
}
