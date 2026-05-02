"use server";

import { revalidatePath } from "next/cache";
import { customersController, type CustomerNoteDTO } from "@/backend";
import { runAction, type ActionResult } from "@/lib/action-result";
import { getStaffContext } from "@/lib/staff-context";

export async function addCustomerNoteAction(
  customerEmail: string,
  body: string,
): Promise<ActionResult<CustomerNoteDTO>> {
  return runAction(async () => {
    const context = await getStaffContext();
    const dto = await customersController.addNote({
      input: { customerEmail, body },
      context,
    });
    revalidatePath(`/admin/customers/${encodeURIComponent(customerEmail)}`);
    return dto;
  });
}

export async function deleteCustomerNoteAction(
  id: string,
  customerEmail: string,
): Promise<ActionResult<void>> {
  return runAction(async () => {
    const context = await getStaffContext();
    await customersController.deleteNote({ input: { id }, context });
    revalidatePath(`/admin/customers/${encodeURIComponent(customerEmail)}`);
  });
}
