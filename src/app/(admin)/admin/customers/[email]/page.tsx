import Link from "next/link";
import { notFound } from "next/navigation";
import {
  customersController,
  NotFoundError,
  servicesController,
  settingsController,
  therapistsController,
} from "@/backend";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/format";
import { CustomerNotesPanel } from "./notes-panel";

export const dynamic = "force-dynamic";

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ email: string }>;
}) {
  const { email: rawEmail } = await params;
  const email = decodeURIComponent(rawEmail);
  let customer;
  try {
    customer = await customersController.get({
      input: { email },
      context: { role: "admin" },
    });
  } catch (err) {
    if (err instanceof NotFoundError) notFound();
    throw err;
  }
  const [therapists, services, settings] = await Promise.all([
    therapistsController.list({ input: { activeOnly: false } }),
    servicesController.list({ input: { activeOnly: false } }),
    settingsController.get(),
  ]);
  const tName = new Map(therapists.map((t) => [t.id, t.name]));
  const sName = new Map(services.map((s) => [s.id, s.name]));
  const tz = settings.businessTimezone;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link href="/admin/customers" className="text-xs text-coral-dark hover:underline">
          ← Back
        </Link>
        <h1 className="mt-1 font-display text-3xl text-coral-dark">{customer.name}</h1>
        <p className="text-sm text-ink/65">{customer.email}</p>
        <p className="text-xs text-ink/55">{customer.phone}</p>
      </div>

      <section className="rounded-2xl bg-cream/80 p-5 ring-1 ring-coral/10">
        <p className="font-display text-xl text-coral-dark">Booking history</p>
        {customer.bookings.length === 0 ? (
          <p className="mt-2 text-sm text-ink/60">No bookings yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-coral/10">
            {customer.bookings.map((b) => (
              <li key={b.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <div>
                  <Link
                    href={`/admin/bookings/${b.id}`}
                    className="font-medium text-coral-dark hover:underline"
                  >
                    {sName.get(b.serviceId) ?? "Service"}
                  </Link>
                  <p className="text-xs text-ink/55">
                    {formatDateTime(b.startAt, tz)} · {tName.get(b.therapistId) ?? "-"}
                  </p>
                </div>
                <Badge tone={b.status === "completed" ? "success" : b.status === "cancelled" ? "danger" : "info"}>
                  {b.status}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </section>

      <CustomerNotesPanel customerEmail={customer.email} notes={customer.notes} />
    </div>
  );
}
