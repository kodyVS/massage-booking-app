import Link from "next/link";
import { customersController, settingsController } from "@/backend";
import { EmptyState } from "@/components/ui/empty";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AdminCustomersPage() {
  const [customers, settings] = await Promise.all([
    customersController.list({
      input: undefined,
      context: { role: "admin" },
    }),
    settingsController.get(),
  ]);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header>
        <h1 className="font-display text-3xl text-coral-dark">Customers</h1>
        <p className="text-sm text-ink/60">
          Derived from booking history. {customers.length} unique customer
          {customers.length === 1 ? "" : "s"}.
        </p>
      </header>

      {customers.length === 0 ? (
        <EmptyState title="No customers yet" description="They'll appear here after their first booking." />
      ) : (
        <div className="overflow-x-auto rounded-2xl bg-cream/80 ring-1 ring-coral/10">
          <table className="min-w-full text-sm">
            <thead className="bg-blush/40 text-left text-xs uppercase tracking-wide text-ink/60">
              <tr>
                <th className="px-4 py-2">Customer</th>
                <th className="px-4 py-2">Bookings</th>
                <th className="px-4 py-2">Upcoming</th>
                <th className="px-4 py-2">Last visit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-coral/5">
              {customers.map((c) => (
                <tr key={c.email} className="hover:bg-cream/60">
                  <td className="px-4 py-2">
                    <Link
                      href={`/admin/customers/${encodeURIComponent(c.email)}`}
                      className="font-medium text-coral-dark hover:underline"
                    >
                      {c.name}
                    </Link>
                    <div className="text-xs text-ink/55">{c.email}</div>
                  </td>
                  <td className="px-4 py-2 text-ink">{c.totalBookings}</td>
                  <td className="px-4 py-2 text-ink">{c.upcomingBookings}</td>
                  <td className="px-4 py-2 text-ink/80">
                    {c.lastBookingAt
                      ? formatDate(c.lastBookingAt, settings.businessTimezone)
                      : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
