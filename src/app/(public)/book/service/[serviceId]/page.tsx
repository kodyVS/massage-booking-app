import Link from "next/link";
import { notFound } from "next/navigation";
import {
  servicesController,
  settingsController,
  therapistsController,
  NotFoundError,
} from "@/backend";
import { ServiceBookingPicker } from "@/components/booking/service-booking-picker";
import { formatDuration, formatPrice } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function BookServicePage({
  params,
}: {
  params: Promise<{ serviceId: string }>;
}) {
  const { serviceId } = await params;
  let service;
  try {
    service = await servicesController.get({ input: { id: serviceId } });
  } catch (err) {
    if (err instanceof NotFoundError) notFound();
    throw err;
  }
  if (!service.active) notFound();

  // Therapists who can perform this service — used by the picker to render
  // names alongside available time slots.
  const [therapists, settings] = await Promise.all([
    therapistsController.list({
      input: { activeOnly: true, serviceId },
    }),
    settingsController.get(),
  ]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <header className="mb-6">
        <Link
          href="/book"
          className="text-sm text-coral-dark hover:underline"
        >
          ← All services
        </Link>
        <h1 className="mt-2 font-display text-3xl text-coral-dark sm:text-4xl">
          Book a {service.name}
        </h1>
        <p className="mt-2 flex flex-wrap items-baseline gap-x-3 text-sm text-ink/75">
          <span className="text-base font-semibold text-coral-dark">
            {formatPrice(service.price)}
          </span>
          <span className="uppercase tracking-wide text-ink/60">
            {formatDuration(service.durationMin)}
          </span>
        </p>
        {service.description && (
          <p className="mt-3 text-ink/85">{service.description}</p>
        )}
      </header>

      {therapists.length === 0 ? (
        <p className="rounded-2xl bg-blush/40 p-5 text-ink/75 ring-1 ring-coral/15">
          No therapists currently offer this service. Please check back later
          or pick a different service.
        </p>
      ) : (
        <ServiceBookingPicker
          service={service}
          therapists={therapists}
          tz={settings.businessTimezone}
        />
      )}
    </div>
  );
}
