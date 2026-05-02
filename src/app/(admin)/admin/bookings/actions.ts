"use server";

import { revalidatePath } from "next/cache";
import { bookingsController, type BookingDTO } from "@/backend";
import { runAction, type ActionResult } from "@/lib/action-result";
import { getStaffContext } from "@/lib/staff-context";

export async function rescheduleBookingAction(
  id: string,
  newStartAt: string,
): Promise<ActionResult<BookingDTO>> {
  return runAction(async () => {
    const context = await getStaffContext();
    const dto = await bookingsController.reschedule({
      input: { id, newStartAt },
      context,
    });
    revalidatePath("/admin/bookings");
    return dto;
  });
}

export async function cancelBookingAction(
  id: string,
  reason?: string,
): Promise<ActionResult<BookingDTO>> {
  return runAction(async () => {
    const context = await getStaffContext();
    const dto = await bookingsController.cancel({
      input: { id, reason },
      context,
    });
    revalidatePath("/admin/bookings");
    return dto;
  });
}

export async function markNoShowAction(id: string): Promise<ActionResult<BookingDTO>> {
  return runAction(async () => {
    const context = await getStaffContext();
    const dto = await bookingsController.markNoShow({ input: { id }, context });
    revalidatePath("/admin/bookings");
    return dto;
  });
}

export async function markCompletedAction(id: string): Promise<ActionResult<BookingDTO>> {
  return runAction(async () => {
    const context = await getStaffContext();
    const dto = await bookingsController.markCompleted({ input: { id }, context });
    revalidatePath("/admin/bookings");
    return dto;
  });
}

export async function updateTherapistNotesAction(
  id: string,
  notes: string,
): Promise<ActionResult<BookingDTO>> {
  return runAction(async () => {
    const context = await getStaffContext();
    const dto = await bookingsController.updateTherapistNotes({
      input: { id, notes },
      context,
    });
    revalidatePath("/admin/bookings");
    revalidatePath(`/admin/bookings/${id}`);
    revalidatePath(`/portal/bookings/${id}`);
    return dto;
  });
}
