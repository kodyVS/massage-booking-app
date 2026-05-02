import Link from "next/link";
import { servicesController } from "@/backend";
import { ServiceBookingCard } from "@/components/booking/service-booking-card";

export const dynamic = "force-dynamic";

export default async function BookIndexPage() {
  const services = await servicesController.list({
    input: { activeOnly: true },
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <header className="mb-8 text-center">
        <h1 className="font-display text-4xl text-coral-dark sm:text-5xl">
          Book a session
        </h1>
        <p className="mt-3 text-ink/80">
          Pick the service you&apos;re after — we&apos;ll show you every open
          time and which therapist can take it.
        </p>
      </header>

      {services.length === 0 ? (
        <p className="text-center text-ink/70">
          New services are coming soon. Check back shortly.
        </p>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2">
          {services.map((s) => (
            <ServiceBookingCard key={s.id} service={s} />
          ))}
        </div>
      )}

      <section className="mt-10 grid gap-3 rounded-2xl bg-blush/40 p-5 ring-1 ring-coral/15 sm:flex sm:items-center sm:justify-between sm:gap-6">
        <div>
          <h2 className="font-display text-lg text-coral-dark">
            Prefer to pick by therapist?
          </h2>
          <p className="text-sm text-ink/75">
            Browse our team and book directly with someone you&apos;ve seen
            before.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/book/therapists"
            className="rounded-full bg-cream px-5 py-2.5 text-sm font-semibold text-coral-dark ring-1 ring-coral/30 transition hover:ring-coral"
          >
            Browse by therapist →
          </Link>
          <Link
            href="/book/any"
            className="rounded-full bg-coral px-5 py-2.5 text-sm font-semibold text-cream transition hover:bg-coral-dark"
          >
            Earliest opening →
          </Link>
        </div>
      </section>
    </div>
  );
}
