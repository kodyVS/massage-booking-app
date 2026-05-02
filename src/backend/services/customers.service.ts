import { connectDB } from "../db/connection";
import { BookingModel, bookingToDTO, type BookingDTO } from "../models/booking.model";
import {
  CustomerNoteModel,
  customerNoteToDTO,
  type CustomerNoteDTO,
} from "../models/customerNote.model";
import { NotFoundError } from "../types/errors";
import {
  addCustomerNoteSchema,
  deleteCustomerNoteSchema,
  getCustomerSchema,
  type AddCustomerNoteInput,
  type DeleteCustomerNoteInput,
  type GetCustomerInput,
} from "../validation/customers.schema";
import { record as recordAudit } from "./audit.service";
import { Types } from "mongoose";

type AuditCtx = { userId?: string; role?: "admin" | "worker" | "system" };

export interface CustomerSummaryDTO {
  email: string;
  name: string;
  phone: string;
  totalBookings: number;
  upcomingBookings: number;
  lastBookingAt?: string;
}

export interface CustomerDetailDTO {
  email: string;
  name: string;
  phone: string;
  bookings: BookingDTO[];
  notes: CustomerNoteDTO[];
}

/**
 * Customers are derived from booking records — there is no Customer collection.
 * Group by lowercased email; pick the most recent booking's name + phone as
 * canonical (so updates ripple through automatically).
 */
export async function listCustomers(): Promise<CustomerSummaryDTO[]> {
  await connectDB();
  const now = new Date();
  const rows = (await BookingModel.aggregate([
    { $sort: { createdAt: -1 } },
    {
      $group: {
        _id: { $toLower: "$customerEmail" },
        name: { $first: "$customerName" },
        phone: { $first: "$customerPhone" },
        totalBookings: { $sum: 1 },
        upcomingBookings: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $gte: ["$startAt", now] },
                  { $in: ["$status", ["confirmed", "pending"]] },
                ],
              },
              1,
              0,
            ],
          },
        },
        lastBookingAt: { $max: "$startAt" },
      },
    },
    { $sort: { lastBookingAt: -1 } },
    { $limit: 500 },
  ]).exec()) as Array<{
    _id: string;
    name: string;
    phone: string;
    totalBookings: number;
    upcomingBookings: number;
    lastBookingAt?: Date;
  }>;
  return rows.map((r) => ({
    email: r._id,
    name: r.name,
    phone: r.phone,
    totalBookings: r.totalBookings,
    upcomingBookings: r.upcomingBookings,
    lastBookingAt: r.lastBookingAt?.toISOString(),
  }));
}

export async function getCustomer(
  input: GetCustomerInput,
): Promise<CustomerDetailDTO> {
  const { email } = getCustomerSchema.parse(input);
  await connectDB();
  const bookings = await BookingModel.find({ customerEmail: email })
    .sort({ startAt: -1 })
    .limit(200)
    .exec();
  if (bookings.length === 0) {
    throw new NotFoundError("Customer not found");
  }
  const latest = bookings[0]!;
  const notes = await CustomerNoteModel.find({ customerEmail: email })
    .sort({ createdAt: -1 })
    .exec();
  return {
    email,
    name: latest.customerName,
    phone: latest.customerPhone,
    bookings: bookings.map(bookingToDTO),
    notes: notes.map(customerNoteToDTO),
  };
}

export async function addCustomerNote(
  input: AddCustomerNoteInput,
  context?: AuditCtx,
): Promise<CustomerNoteDTO> {
  const parsed = addCustomerNoteSchema.parse(input);
  await connectDB();
  const doc = await CustomerNoteModel.create({
    customerEmail: parsed.customerEmail,
    body: parsed.body,
    authorId: context?.userId ? new Types.ObjectId(context.userId) : undefined,
  });
  const dto = customerNoteToDTO(doc);
  await recordAudit({
    actorId: context?.userId,
    actorRole: context?.role ?? "system",
    action: "customer_note.create",
    entityType: "CustomerNote",
    entityId: dto.id,
    after: dto,
  });
  return dto;
}

export async function deleteCustomerNote(
  input: DeleteCustomerNoteInput,
  context?: AuditCtx,
): Promise<void> {
  const { id } = deleteCustomerNoteSchema.parse(input);
  await connectDB();
  const doc = await CustomerNoteModel.findById(id).exec();
  if (!doc) throw new NotFoundError("Note not found");
  const before = customerNoteToDTO(doc);
  await CustomerNoteModel.deleteOne({ _id: doc._id }).exec();
  await recordAudit({
    actorId: context?.userId,
    actorRole: context?.role ?? "system",
    action: "customer_note.delete",
    entityType: "CustomerNote",
    entityId: id,
    before,
  });
}
