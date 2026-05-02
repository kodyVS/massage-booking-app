import { notFound } from "next/navigation";
import {
  servicesController,
  settingsController,
  therapistsController,
  NotFoundError,
} from "@/backend";
import { BookingPicker } from "@/components/booking/booking-picker";

export const revalidate = 60;
export const dynamicParams = true;
// Empty list at build time; Next.js renders + caches each therapist on first
// request and reuses the cache for `revalidate` seconds. Avoids needing DB
// access during the Vercel build phase.
export async function generateStaticParams() {
  return [];
}

export default async function BookTherapistPage({
  params,
}: {
  params: Promise<{ therapistId: string }>;
}) {
  const { therapistId } = await params;
  let therapist;
  try {
    therapist = await therapistsController.get({ input: { id: therapistId } });
  } catch (err) {
    if (err instanceof NotFoundError) notFound();
    throw err;
  }
  if (!therapist.active) notFound();

  const [services, settings] = await Promise.all([
    servicesController.list({
      input: { activeOnly: true, therapistId },
    }),
    settingsController.get(),
  ]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <header className="mb-8">
        <h1 className="font-display text-3xl text-coral-dark sm:text-4xl">
          Book with {therapist.name}
        </h1>
        {therapist.bio && (
          <p className="mt-3 text-ink/85">{therapist.bio}</p>
        )}
        {therapist.specialties.length > 0 && (
          <ul className="mt-3 flex flex-wrap gap-1.5">
            {therapist.specialties.map((s) => (
              <li
                key={s}
                className="rounded-full bg-periwinkle/40 px-2.5 py-0.5 text-xs text-ink/85"
              >
                {s}
              </li>
            ))}
          </ul>
        )}
        {(therapist.licenseNumber || therapist.yearsExperience) && (
          <p className="mt-2 text-xs text-ink/60">
            {therapist.licenseNumber && <>License #{therapist.licenseNumber}</>}
            {therapist.licenseNumber && therapist.yearsExperience ? " · " : ""}
            {therapist.yearsExperience &&
              `${therapist.yearsExperience} yrs experience`}
          </p>
        )}
      </header>

      <BookingPicker
        therapist={therapist}
        services={services}
        tz={settings.businessTimezone}
      />
    </div>
  );
}
