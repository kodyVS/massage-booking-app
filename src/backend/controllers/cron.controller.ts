import * as remindersService from "../services/reminders.service";

/**
 * Cron entry point for the 24h reminder job. The Next.js route handler
 * verifies `CRON_SECRET` and then calls this - the controller stays
 * framework-agnostic.
 */
export async function sendReminders(): Promise<remindersService.RemindersResult> {
  return remindersService.sendDueReminders();
}
