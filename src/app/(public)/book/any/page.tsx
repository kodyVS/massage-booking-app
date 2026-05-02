import {
  servicesController,
  settingsController,
  therapistsController,
} from "@/backend";
import { AnyTherapistPicker } from "@/components/booking/any-therapist-picker";

export const dynamic = "force-dynamic";

export default async function BookAnyPage() {
  const [services, therapists, settings] = await Promise.all([
    servicesController.list({ input: { activeOnly: true } }),
    therapistsController.list({ input: { activeOnly: true } }),
    settingsController.get(),
  ]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <header className="mb-8">
        <h1 className="font-display text-3xl text-coral-dark sm:text-4xl">
          Find the earliest opening
        </h1>
        <p className="mt-3 text-ink/85">
          Pick a service and we&apos;ll show you the earliest slot across our team.
        </p>
      </header>
      <AnyTherapistPicker
        services={services}
        therapists={therapists}
        tz={settings.businessTimezone}
      />
    </div>
  );
}
