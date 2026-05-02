import Link from "next/link";
import {
  bookingsController,
  servicesController,
  settingsController,
  therapistsController,
  type BookingDTO,
  type ListBookingsInput,
} from "@/backend";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty";
import { formatDate, formatTime } from "@/lib/format";
import { BookingsFilters } from "./filters";
import { BookingRowActions } from "./row-actions";

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

export default async function AdminBookingsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const filter = parseFilters(sp);
  const [bookings, settings, therapists, services] = await Promise.all([
    bookingsController.list({ input: filter, context: { role: "admin" } }),
    settingsController.get(),
    therapistsController.list({ input: { activeOnly: false } }),
    servicesController.list({ input: { activeOnly: false } }),
  ]);
  const therapistMap = new Map(therapists.map((t) => [t.id, t.name]));
  const serviceMap = new Map(services.map((s) => [s.id, s.name]));

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header>
        <h1 className="font-display text-3xl text-coral-dark">Bookings</h1>
        <p className="text-sm text-ink/60">
          {bookings.length} record{bookings.length === 1 ? "" : "s"}
        </p>
      </header>
      <BookingsFilters therapists={therapists} initial={filter} />

      {bookings.length === 0 ? (
        <EmptyState
          title="No bookings match these filters"
          description="Try widening the date range or clearing the search."
        />
      ) : (
        <div className="overflow-x-auto rounded-2xl bg-cream/80 ring-1 ring-coral/10">
          <table className="min-w-full text-sm">
            <thead className="bg-blush/40 text-left text-xs uppercase tracking-wide text-ink/60">
              <tr>
                <th className="px-4 py-2">When</th>
                <th className="px-4 py-2">Customer</th>
                <th className="px-4 py-2">Therapist</th>
                <th className="px-4 py-2">Service</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-coral/5">
              {bookings.map((b) => (
                <BookingRow
                  key={b.id}
                  booking={b}
                  tz={settings.businessTimezone}
                  therapistName={therapistMap.get(b.therapistId) ?? "—"}
                  serviceName={serviceMap.get(b.serviceId) ?? "—"}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function BookingRow({
  booking,
  tz,
  therapistName,
  serviceName,
}: {
  booking: BookingDTO;
  tz: string;
  therapistName: string;
  serviceName: string;
}) {
  return (
    <tr className="hover:bg-cream/60">
      <td className="px-4 py-2 align-top">
        <div className="font-medium text-ink">{formatDate(booking.startAt, tz)}</div>
        <div className="text-xs text-ink/60">{formatTime(booking.startAt, tz)}</div>
      </td>
      <td className="px-4 py-2 align-top">
        <Link
          href={`/admin/customers/${encodeURIComponent(booking.customerEmail)}`}
          className="text-coral-dark hover:underline"
        >
          {booking.customerName}
        </Link>
        <div className="text-xs text-ink/55">{booking.customerEmail}</div>
      </td>
      <td className="px-4 py-2 align-top text-ink/80">{therapistName}</td>
      <td className="px-4 py-2 align-top text-ink/80">{serviceName}</td>
      <td className="px-4 py-2 align-top">
        <Badge tone={statusTone(booking.status)}>{booking.status}</Badge>
      </td>
      <td className="px-4 py-2 align-top text-right">
        <BookingRowActions booking={booking} tz={tz} />
      </td>
    </tr>
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

function parseFilters(sp: SearchParams): ListBookingsInput {
  const get = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);
  const out: ListBookingsInput = { limit: 200 };
  const therapistId = get("therapistId");
  if (therapistId && /^[a-f0-9]{24}$/i.test(therapistId)) out.therapistId = therapistId;
  const status = get("status");
  if (status && ["pending", "confirmed", "cancelled", "completed", "no_show"].includes(status)) {
    out.status = status as ListBookingsInput["status"];
  }
  const customerName = get("q");
  if (customerName) out.customerName = customerName;
  const fromDate = get("from");
  if (fromDate) out.fromDate = new Date(`${fromDate}T00:00:00.000Z`).toISOString();
  const toDate = get("to");
  if (toDate) out.toDate = new Date(`${toDate}T23:59:59.999Z`).toISOString();
  return out;
}
