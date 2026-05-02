import Link from "next/link";
import {
  intakeController,
  servicesController,
  settingsController,
  therapistsController,
  ValidationError,
} from "@/backend";
import { formatDate, formatTime } from "@/lib/format";
import { IntakeForm } from "./intake-form";

export const dynamic = "force-dynamic";

/**
 * Public intake page — token-gated, no login required. The token is a JWT
 * minted by `tokens.service.generateIntakeToken(bookingId)` and sent in the
 * confirmation email when `settings.intakeRequired` is true.
 */
export default async function IntakePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  let booking;
  try {
    booking = await intakeController.getByToken({ input: { token } });
  } catch (err) {
    if (err instanceof ValidationError) {
      return <InvalidLink />;
    }
    throw err;
  }

  const [therapist, service, settings] = await Promise.all([
    therapistsController.get({ input: { id: booking.therapistId } }),
    servicesController.get({ input: { id: booking.serviceId } }),
    settingsController.get(),
  ]);

  const tz = settings.businessTimezone;
  const alreadySubmitted = Boolean(booking.intakeFormData?.signedAt);

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-14">
      <header className="mb-6">
        <h1 className="font-display text-3xl text-coral-dark sm:text-4xl">
          Pre-visit intake
        </h1>
        <p className="mt-2 text-ink/85">
          A few questions so {therapist.name} can prepare for your visit.
        </p>
      </header>

      <section className="mb-8 rounded-2xl bg-blush/40 p-5 ring-1 ring-coral/15">
        <dl className="grid gap-3 text-sm text-ink/85 sm:grid-cols-2">
          <div>
            <dt className="text-xs uppercase tracking-wide text-ink/60">
              When
            </dt>
            <dd className="font-medium">
              {formatDate(booking.startAt, tz)} ·{" "}
              {formatTime(booking.startAt, tz)}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-ink/60">
              Service
            </dt>
            <dd className="font-medium">{service.name}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-ink/60">
              Therapist
            </dt>
            <dd className="font-medium">{therapist.name}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-ink/60">
              Customer
            </dt>
            <dd className="font-medium">{booking.customerName}</dd>
          </div>
        </dl>
      </section>

      <IntakeForm token={token} alreadySubmitted={alreadySubmitted} />
    </div>
  );
}

function InvalidLink() {
  return (
    <div className="mx-auto max-w-xl px-4 py-16 text-center sm:px-6">
      <h1 className="font-display text-2xl text-coral-dark">
        Intake link invalid
      </h1>
      <p className="mt-2 text-ink/80">
        This link has expired or isn&apos;t recognized.
      </p>
      <Link
        href="/book"
        className="mt-4 inline-block rounded-full bg-coral px-5 py-2 text-sm font-semibold text-cream"
      >
        Back to booking
      </Link>
    </div>
  );
}
