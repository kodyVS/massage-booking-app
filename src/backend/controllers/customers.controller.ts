import * as customersService from "../services/customers.service";
import { ForbiddenError } from "../types/errors";
import type { ControllerInput, RequestContext } from "../types";
import type {
  AddCustomerNoteInput,
  DeleteCustomerNoteInput,
  GetCustomerInput,
} from "../validation/customers.schema";

export async function list({
  context,
}: ControllerInput<undefined>): Promise<customersService.CustomerSummaryDTO[]> {
  requireAdmin(context);
  return customersService.listCustomers();
}

export async function get({
  input,
  context,
}: ControllerInput<GetCustomerInput>): Promise<customersService.CustomerDetailDTO> {
  requireAdmin(context);
  return customersService.getCustomer(input);
}

export async function addNote({
  input,
  context,
}: ControllerInput<AddCustomerNoteInput>) {
  requireAdmin(context);
  return customersService.addCustomerNote(input, {
    userId: context?.userId,
    role: context?.role,
  });
}

export async function deleteNote({
  input,
  context,
}: ControllerInput<DeleteCustomerNoteInput>): Promise<void> {
  requireAdmin(context);
  await customersService.deleteCustomerNote(input, {
    userId: context?.userId,
    role: context?.role,
  });
}

function requireAdmin(context: RequestContext | undefined): void {
  if (context?.role !== "admin") {
    throw new ForbiddenError("Admin access required");
  }
}
