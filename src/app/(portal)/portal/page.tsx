import Link from "next/link";
import { redirect } from "next/navigation";
import {
  bookingsController,
  settingsController,
  type BookingDTO,
} from "@/backend";
import { auth } from "@/auth";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty";
import { formatDateTime, formatTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function WorkerDashboardPage() {
  const session = await auth();
  if (!session?.user?.therapistId) redirect("/login");
  const therapistId = session.user.therapistId;

  const settings = await settingsController.get();
  const tz = settings.businessTimezone;
  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date(startOfToday);
  endOfToday.setDate(endOfToday.getDate() + 1);

  const [today, upcoming] = await Promise.all([
    bookingsController.list({
      input: {
        fromDate: startOfToday.toISOString(),
        toDate: endOfToday.toISOString(),
        limit: 100,
      },
      context: { role: "worker", userId: session.user.id, therapistId },
    }),
    bookingsController.list({
      input: {
        fromDate: now.toISOString(),
        status: "confirmed",
        limit: 10,
      },
      context: { role: "worker", userId: session.user.id, therapistId },
    }),
  ]);

  const next = upcoming.find((b) => b.status === "confirmed" || b.status === "pending");

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header>
        <h1 className="font-display text-3xl text-coral-dark">Today</h1>
        <p className="text-sm text-ink/60">{formatDateTime(now.toISOString(), tz)}</p>
      </header>

      <section className="rounded-2xl bg-cream/80 p-5 ring-1 ring-coral/10">
        <p className="text-xs uppercase tracking-wide text-ink/55">Next appointment</p>
        {next ? (
          <Link
            href={`/portal/bookings/${next.id}`}
            className="mt-1 block hover:underline"
          >
            <p className="font-display text-2xl text-coral-dark">{next.customerName}</p>
            <p className="text-sm text-ink/70">{formatDateTime(next.startAt, tz)}</p>
          </Link>
        ) : (
          <p className="mt-1 text-sm text-ink/55">No upcoming bookings.</p>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="font-display text-xl text-coral-dark">Today&apos;s schedule</h2>
        {today.length === 0 ? (
          <EmptyState title="Nothing on the books today" />
        ) : (
          <ul className="divide-y divide-coral/10 rounded-2xl bg-cream/80 ring-1 ring-coral/10">
            {today.map((b) => (
              <TodayRow key={b.id} booking={b} tz={tz} />
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="font-display text-xl text-coral-dark">Upcoming</h2>
        {upcoming.length === 0 ? (
          <EmptyState title="No upcoming bookings" />
        ) : (
          <ul className="divide-y divide-coral/10 rounded-2xl bg-cream/80 ring-1 ring-coral/10">
            {upcoming.slice(0, 8).map((b) => (
              <UpcomingRow key={b.id} booking={b} tz={tz} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function TodayRow({ booking, tz }: { booking: BookingDTO; tz: string }) {
  return (
    <li className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
      <Link href={`/portal/bookings/${booking.id}`} className="flex-1 hover:underline">
        <p className="font-medium text-ink">{booking.customerName}</p>
        <p className="text-xs text-ink/60">{formatTime(booking.startAt, tz)}</p>
      </Link>
      <Badge tone="info">{booking.status}</Badge>
    </li>
  );
}

function UpcomingRow({ booking, tz }: { booking: BookingDTO; tz: string }) {
  return (
    <li className="px-4 py-3 text-sm">
      <Link href={`/portal/bookings/${booking.id}`} className="block hover:underline">
        <p className="font-medium text-ink">{booking.customerName}</p>
        <p className="text-xs text-ink/60">{formatDateTime(booking.startAt, tz)}</p>
      </Link>
    </li>
  );
}
