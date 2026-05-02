import { Types } from "mongoose";
import { connectDB } from "../db/connection";
import { BookingModel, bookingToDTO, type BookingDTO } from "../models/booking.model";
import { NotFoundError } from "../types/errors";
import { intakeTokenSchema, submitIntakeSchema, type IntakeTokenInput, type SubmitIntakeInput } from "../validation/intake.schema";
import { verifyIntakeToken } from "./tokens.service";

/** Resolve an intake-form token to its booking. Customer-facing. */
export async function getByToken(input: IntakeTokenInput): Promise<BookingDTO> {
  const { token } = intakeTokenSchema.parse(input);
  const { bookingId } = verifyIntakeToken(token);
  await connectDB();
  const doc = await BookingModel.findById(new Types.ObjectId(bookingId)).exec();
  if (!doc) throw new NotFoundError("Booking not found");
  return bookingToDTO(doc);
}

export async function submit(input: SubmitIntakeInput): Promise<BookingDTO> {
  const { token, data } = submitIntakeSchema.parse(input);
  const { bookingId } = verifyIntakeToken(token);
  await connectDB();
  const doc = await BookingModel.findByIdAndUpdate(
    new Types.ObjectId(bookingId),
    {
      $set: {
        intakeFormData: { ...data, signedAt: new Date() },
      },
    },
    { new: true },
  ).exec();
  if (!doc) throw new NotFoundError("Booking not found");
  return bookingToDTO(doc);
}
