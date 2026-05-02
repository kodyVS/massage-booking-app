import Link from "next/link";
import { redirect } from "next/navigation";
import {
  bookingsController,
  schedulesController,
  settingsController,
  therapistsController,
} from "@/backend";
import { auth } from "@/auth";
import { ScheduleWeek } from "@/components/portal/schedule-week";

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

export default async function WorkerSchedulePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await auth();
  if (!session?.user?.therapistId) redirect("/login");
  const therapistId = session.user.therapistId;

  const sp = await searchParams;
  const weekStartStr =
    typeof sp.week === "string" && /^\d{4}-\d{2}-\d{2}$/.test(sp.week)
      ? sp.week
      : weekStartFor(new Date());
  const weekStart = new Date(`${weekStartStr}T00:00:00.000Z`);
  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 7);

  const [therapist, settings, bookings, timeOff] = await Promise.all([
    therapistsController.get({ input: { id: therapistId } }),
    settingsController.get(),
    bookingsController.list({
      input: {
        fromDate: weekStart.toISOString(),
        toDate: weekEnd.toISOString(),
        limit: 200,
      },
      context: { role: "worker", userId: session.user.id, therapistId },
    }),
    schedulesController.listTimeOff({
      input: { therapistId, status: "approved" },
      context: { role: "worker", userId: session.user.id, therapistId },
    }),
  ]);

  const prevWeek = shiftDate(weekStart, -7);
  const nextWeek = shiftDate(weekStart, 7);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl text-coral-dark">Your schedule</h1>
          <p className="text-sm text-ink/60">Week of {weekStartStr}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/portal/schedule?week=${prevWeek}`}
            className="rounded-xl bg-cream px-3 py-1.5 text-sm ring-1 ring-coral/20 hover:ring-coral/40"
          >
            ← Prev
          </Link>
          <Link
            href={`/portal/schedule?week=${weekStartFor(new Date())}`}
            className="rounded-xl bg-cream px-3 py-1.5 text-sm ring-1 ring-coral/20 hover:ring-coral/40"
          >
            Today
          </Link>
          <Link
            href={`/portal/schedule?week=${nextWeek}`}
            className="rounded-xl bg-cream px-3 py-1.5 text-sm ring-1 ring-coral/20 hover:ring-coral/40"
          >
            Next →
          </Link>
        </div>
      </header>

      <ScheduleWeek
        therapists={[therapist]}
        weekStartIso={weekStart.toISOString()}
        bookings={bookings}
        timeOff={timeOff}
        tz={settings.businessTimezone}
        canBlock={false}
        restrictToTherapistId={therapistId}
        bookingHrefPrefix="/portal/bookings"
      />

      <p className="text-xs text-ink/55">
        Block time off in the{" "}
        <Link href="/portal/availability" className="text-coral-dark hover:underline">
          time-off
        </Link>{" "}
        section.
      </p>
    </div>
  );
}

/** 7-day window starting today (matches the admin schedule view). */
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
