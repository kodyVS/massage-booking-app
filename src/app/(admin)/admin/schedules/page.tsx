import Link from "next/link";
import {
  bookingsController,
  schedulesController,
  servicesController,
  settingsController,
  therapistsController,
} from "@/backend";
import { EmptyState } from "@/components/ui/empty";
import { ScheduleDayCards } from "@/components/admin/schedule-day-cards";
import { TimeOffApprovals } from "./time-off-approvals";

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

export default async function AdminSchedulesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const weekStartStr =
    typeof sp.week === "string" && /^\d{4}-\d{2}-\d{2}$/.test(sp.week)
      ? sp.week
      : weekStartFor(new Date());

  const settings = await settingsController.get();
  const therapists = await therapistsController.list({ input: { activeOnly: true } });
  const services = await servicesController.list({ input: { activeOnly: false } });

  if (therapists.length === 0) {
    return (
      <div className="mx-auto max-w-5xl space-y-6">
        <h1 className="font-display text-3xl text-coral-dark">Schedule</h1>
        <EmptyState
          title="No active therapists"
          description="Add a therapist to see the weekly schedule."
        />
      </div>
    );
  }

  const weekStart = new Date(`${weekStartStr}T00:00:00.000Z`);
  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 7);

  const [bookings, allTimeOff, pending] = await Promise.all([
    bookingsController.list({
      input: {
        fromDate: weekStart.toISOString(),
        toDate: weekEnd.toISOString(),
        limit: 500,
      },
      context: { role: "admin" },
    }),
    schedulesController.listTimeOff({
      input: { status: "approved" },
      context: { role: "admin" },
    }),
    schedulesController.listTimeOff({
      input: { status: "pending" },
      context: { role: "admin" },
    }),
  ]);

  const prevWeek = shiftDate(weekStart, -7);
  const nextWeek = shiftDate(weekStart, 7);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl text-coral-dark">Schedule</h1>
          <p className="text-sm text-ink/60">
            Week of {weekStartStr} · all therapists
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/admin/schedules?week=${prevWeek}`}
            className="rounded-xl bg-cream px-3 py-1.5 text-sm ring-1 ring-coral/20 hover:ring-coral/40"
          >
            ← Prev week
          </Link>
          <Link
            href={`/admin/schedules?week=${weekStartFor(new Date())}`}
            className="rounded-xl bg-cream px-3 py-1.5 text-sm ring-1 ring-coral/20 hover:ring-coral/40"
          >
            Today
          </Link>
          <Link
            href={`/admin/schedules?week=${nextWeek}`}
            className="rounded-xl bg-cream px-3 py-1.5 text-sm ring-1 ring-coral/20 hover:ring-coral/40"
          >
            Next week →
          </Link>
        </div>
      </header>

      <ScheduleDayCards
        therapists={therapists}
        services={services}
        weekStartIso={weekStart.toISOString()}
        bookings={bookings}
        timeOff={allTimeOff}
        tz={settings.businessTimezone}
      />

      <TimeOffApprovals
        therapists={therapists}
        pending={pending}
        tz={settings.businessTimezone}
      />
    </div>
  );
}

/**
 * Default to a 7-day window starting today rather than the previous Sunday -
 * an admin viewing the schedule cares about today + the next 6 days, not
 * what already happened earlier this week.
 */
function weekStartFor(d: Date): string {
  const x = new Date(d);
  x.setUTCHours(0, 0, 0, 0);
  return x.toISOString().slice(0, 10);
}

function shiftDate(d: Date, days: number): string {
  const x = new Date(d);
  x.setUTCDate(x.getUTCDate() + days);
  return x.toISOString().slice(0, 10);
}
