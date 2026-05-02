import Link from "next/link";
import {
  servicesController,
  settingsController,
  therapistsController,
} from "@/backend";
import { BookingConfirmForm } from "@/components/booking/booking-confirm-form";

export const dynamic = "force-dynamic";

interface SearchParams {
  therapistId?: string;
  serviceId?: string;
  startAt?: string;
}

export default async function ConfirmBookingPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  if (!sp.therapistId || !sp.serviceId || !sp.startAt) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center sm:px-6">
        <h1 className="font-display text-2xl text-coral-dark">
          Missing booking details
        </h1>
        <p className="mt-2 text-ink/80">Please pick a slot first.</p>
        <Link
          href="/book"
          className="mt-4 inline-block rounded-full bg-coral px-5 py-2 text-sm font-semibold text-cream"
        >
          ← Back to booking
        </Link>
      </div>
    );
  }

  const [therapist, service, settings] = await Promise.all([
    therapistsController.get({ input: { id: sp.therapistId } }),
    servicesController.get({ input: { id: sp.serviceId } }),
    settingsController.get(),
  ]);

  const turnstileSiteKey = process.env.TURNSTILE_SITE_KEY ?? "";

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14">
      <header className="mb-8">
        <h1 className="font-display text-3xl text-coral-dark sm:text-4xl">
          Confirm your booking
        </h1>
        <p className="mt-2 text-ink/85">
          Review the details, fill in your contact info, and you&apos;re set.
        </p>
      </header>

      <BookingConfirmForm
        therapist={therapist}
        service={service}
        startAt={sp.startAt}
        cancellationPolicy={settings.cancellationPolicy}
        tz={settings.businessTimezone}
        turnstileSiteKey={turnstileSiteKey}
      />
    </div>
  );
}
