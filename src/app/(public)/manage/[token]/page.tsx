import Link from "next/link";
import {
  bookingsController,
  servicesController,
  settingsController,
  therapistsController,
  ValidationError,
} from "@/backend";
import { ManageBookingActions } from "@/components/booking/manage-booking-actions";
import { formatDate, formatDuration, formatPrice, formatTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function ManageBookingPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  let booking;
  try {
    booking = await bookingsController.get({ input: { manageToken: token } });
  } catch (err) {
    if (err instanceof ValidationError) {
      return (
        <div className="mx-auto max-w-xl px-4 py-16 text-center sm:px-6">
          <h1 className="font-display text-2xl text-coral-dark">
            Manage link invalid
          </h1>
          <p className="mt-2 text-ink/80">
            This link has expired or isn&apos;t recognized.
          </p>
          <Link
            href="/book"
            className="mt-4 inline-block rounded-full bg-coral px-5 py-2 text-sm font-semibold text-cream"
          >
            Book a new session
          </Link>
        </div>
      );
    }
    throw err;
  }

  const [therapist, service, settings] = await Promise.all([
    therapistsController.get({ input: { id: booking.therapistId } }),
    servicesController.get({ input: { id: booking.serviceId } }),
    settingsController.get(),
  ]);

  const tz = settings.businessTimezone;

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-14">
      <header className="mb-6">
        <h1 className="font-display text-3xl text-coral-dark sm:text-4xl">
          Manage your booking
        </h1>
        <p className="mt-2 text-ink/85">
          Use this page to reschedule or cancel your appointment.
        </p>
      </header>

      <section className="rounded-2xl bg-blush/40 p-5 ring-1 ring-coral/15">
        <dl className="grid gap-3 text-sm text-ink/85 sm:grid-cols-2">
          <div>
            <dt className="text-xs uppercase tracking-wide text-ink/60">When</dt>
            <dd className="font-medium">
              {formatDate(booking.startAt, tz)}
              <br />
              {formatTime(booking.startAt, tz)} – {formatTime(booking.endAt, tz)}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-ink/60">
              Therapist
            </dt>
            <dd className="font-medium">{therapist.name}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-ink/60">
              Service
            </dt>
            <dd className="font-medium">
              {service.name} · {formatDuration(service.durationMin)}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-ink/60">
              Status
            </dt>
            <dd className="font-medium capitalize">
              {booking.status.replace("_", " ")}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs uppercase tracking-wide text-ink/60">
              Price
            </dt>
            <dd className="font-medium">
              {formatPrice(service.price)} · pay at visit
            </dd>
          </div>
        </dl>
      </section>

      <section className="mt-6">
        <ManageBookingActions
          token={token}
          therapistId={booking.therapistId}
          serviceId={booking.serviceId}
          tz={tz}
          status={booking.status}
        />
      </section>

      <section className="mt-6 rounded-2xl bg-cream/80 p-5 text-sm text-ink/80 ring-1 ring-coral/10">
        <h2 className="text-xs uppercase tracking-wide text-ink/60">
          Cancellation policy
        </h2>
        <p className="mt-1 whitespace-pre-line">{settings.cancellationPolicy}</p>
      </section>
    </div>
  );
}
