import Link from "next/link";
import {
  bookingsController,
  servicesController,
  settingsController,
  therapistsController,
} from "@/backend";
import { formatDate, formatDuration, formatPrice, formatTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function BookingSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  if (!token) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center sm:px-6">
        <h1 className="font-display text-2xl text-coral-dark">
          Booking not found
        </h1>
        <p className="mt-2 text-ink/80">
          We couldn&apos;t find that confirmation token.
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

  const booking = await bookingsController.get({
    input: { manageToken: token },
  });
  const [therapist, service, settings] = await Promise.all([
    therapistsController.get({ input: { id: booking.therapistId } }),
    servicesController.get({ input: { id: booking.serviceId } }),
    settingsController.get(),
  ]);

  const tz = settings.businessTimezone;

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-14">
      <div className="rounded-3xl bg-blush/40 p-6 ring-1 ring-coral/15 sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-wide text-coral-dark">
          You&apos;re booked
        </p>
        <h1 className="mt-1 font-display text-3xl text-coral-dark sm:text-4xl">
          See you on {formatDate(booking.startAt, tz)}
        </h1>
        <dl className="mt-6 grid gap-3 text-sm text-ink/85 sm:grid-cols-2">
          <div>
            <dt className="text-xs uppercase tracking-wide text-ink/60">When</dt>
            <dd className="font-medium">
              {formatTime(booking.startAt, tz)} – {formatTime(booking.endAt, tz)}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-ink/60">Therapist</dt>
            <dd className="font-medium">{therapist.name}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-ink/60">Service</dt>
            <dd className="font-medium">
              {service.name} · {formatDuration(service.durationMin)}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-ink/60">Price</dt>
            <dd className="font-medium">
              {formatPrice(service.price)} · pay at visit
            </dd>
          </div>
        </dl>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <a
            href={`/api/bookings/ics?token=${encodeURIComponent(token)}`}
            className="rounded-full bg-coral px-5 py-2.5 text-center text-sm font-semibold text-cream shadow-sm transition hover:bg-coral-dark"
          >
            Add to calendar (.ics)
          </a>
          <Link
            href={`/manage/${token}`}
            className="rounded-full border border-coral/30 px-5 py-2.5 text-center text-sm font-medium text-coral-dark transition hover:bg-cream"
          >
            Manage your booking
          </Link>
        </div>
      </div>

      <div className="mt-6 rounded-2xl bg-cream/80 p-5 text-sm text-ink/85 ring-1 ring-coral/10">
        <p>
          A confirmation email is on its way to{" "}
          <span className="font-medium">{booking.customerEmail}</span>. Save the
          &ldquo;Manage your booking&rdquo; link above — you&apos;ll need it to
          reschedule or cancel.
        </p>
        <p className="mt-3 text-xs text-ink/60">
          {settings.cancellationPolicy}
        </p>
      </div>
    </div>
  );
}
