import Link from "next/link";
import {
  bookingsController,
  settingsController,
  therapistsController,
  type BookingDTO,
} from "@/backend";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty";
import { formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const settings = await settingsController.get();
  const tz = settings.businessTimezone;

  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date(startOfToday);
  endOfToday.setDate(endOfToday.getDate() + 1);

  const startOfWeek = new Date(startOfToday);
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(endOfWeek.getDate() + 7);

  const [bookingsToday, bookingsWeek, upcoming, therapists] = await Promise.all([
    bookingsController.list({
      input: {
        fromDate: startOfToday.toISOString(),
        toDate: endOfToday.toISOString(),
        limit: 200,
      },
      context: { role: "admin" },
    }),
    bookingsController.list({
      input: {
        fromDate: startOfWeek.toISOString(),
        toDate: endOfWeek.toISOString(),
        limit: 500,
      },
      context: { role: "admin" },
    }),
    bookingsController.list({
      input: {
        fromDate: now.toISOString(),
        status: "confirmed",
        limit: 10,
      },
      context: { role: "admin" },
    }),
    therapistsController.list({ input: { activeOnly: true } }),
  ]);

  // Occupancy estimate: confirmed booked-minutes ÷ available business-hour-minutes
  // across active therapists for the current week.
  const activeBookings = bookingsWeek.filter(
    (b) => b.status === "confirmed" || b.status === "completed",
  );
  const bookedMinutes = activeBookings.reduce((sum, b) => {
    const dur = (new Date(b.endAt).getTime() - new Date(b.startAt).getTime()) / 60_000;
    return sum + dur;
  }, 0);
  const dailyHours =
    minutesBetween(settings.defaultOpenTime, settings.defaultCloseTime) / 60;
  const availableMinutes =
    therapists.length * settings.defaultDaysOpen.length * dailyHours * 60;
  const occupancy =
    availableMinutes > 0
      ? Math.min(100, Math.round((bookedMinutes / availableMinutes) * 100))
      : 0;

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <header className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl text-coral-dark">Dashboard</h1>
          <p className="text-sm text-ink/60">
            {settings.businessName} · {tz}
          </p>
        </div>
        <Link
          href="/admin/bookings"
          className="rounded-xl bg-coral px-4 py-2 text-sm font-semibold text-cream hover:bg-coral-dark"
        >
          View all bookings
        </Link>
      </header>

      <section
        aria-label="Stats"
        className="grid grid-cols-2 gap-3 sm:grid-cols-4"
      >
        <Stat label="Today" value={bookingsToday.length} />
        <Stat label="This week" value={bookingsWeek.length} />
        <Stat label="Occupancy" value={`${occupancy}%`} />
        <Stat label="Active therapists" value={therapists.length} />
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl text-coral-dark">Upcoming bookings</h2>
        {upcoming.length === 0 ? (
          <EmptyState title="No upcoming bookings" />
        ) : (
          <ul className="divide-y divide-coral/10 rounded-2xl bg-cream/80 ring-1 ring-coral/10">
            {upcoming.map((b) => (
              <UpcomingRow key={b.id} booking={b} tz={tz} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl bg-cream/80 p-4 ring-1 ring-coral/10">
      <p className="text-xs uppercase tracking-wide text-ink/55">{label}</p>
      <p className="mt-1 font-display text-3xl text-coral-dark">{value}</p>
    </div>
  );
}

function UpcomingRow({ booking, tz }: { booking: BookingDTO; tz: string }) {
  return (
    <li className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
      <div>
        <p className="font-medium text-ink">{booking.customerName}</p>
        <p className="text-xs text-ink/60">
          {formatDateTime(booking.startAt, tz)}
        </p>
      </div>
      <Badge tone={statusTone(booking.status)}>{booking.status}</Badge>
    </li>
  );
}

function statusTone(status: BookingDTO["status"]): "info" | "success" | "warning" | "danger" | "neutral" {
  switch (status) {
    case "confirmed":
      return "info";
    case "completed":
      return "success";
    case "no_show":
      return "warning";
    case "cancelled":
      return "danger";
    default:
      return "neutral";
  }
}

function minutesBetween(a: string, b: string): number {
  const [ah, am] = a.split(":").map(Number);
  const [bh, bm] = b.split(":").map(Number);
  return bh * 60 + bm - (ah * 60 + am);
}
