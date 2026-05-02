import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  bookingsController,
  ForbiddenError,
  NotFoundError,
  servicesController,
  settingsController,
  therapistsController,
} from "@/backend";
import { auth } from "@/auth";
import { Badge } from "@/components/ui/badge";
import { TherapistNotesEditor } from "@/components/portal/therapist-notes-editor";
import { formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function WorkerBookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.therapistId) redirect("/login");
  const therapistId = session.user.therapistId;

  const { id } = await params;
  let booking;
  try {
    booking = await bookingsController.get({ input: { id } });
  } catch (err) {
    if (err instanceof NotFoundError) notFound();
    throw err;
  }
  // Workers can only view their own bookings.
  if (booking.therapistId !== therapistId) {
    throw new ForbiddenError("Cannot view another therapist's booking");
  }

  const [service, therapist, settings] = await Promise.all([
    servicesController.get({ input: { id: booking.serviceId } }),
    therapistsController.get({ input: { id: booking.therapistId } }),
    settingsController.get(),
  ]);
  const tz = settings.businessTimezone;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link href="/portal/schedule" className="text-xs text-coral-dark hover:underline">
          ← Back
        </Link>
        <h1 className="mt-1 font-display text-3xl text-coral-dark">
          {booking.customerName}
        </h1>
        <p className="text-sm text-ink/65">{formatDateTime(booking.startAt, tz)}</p>
      </div>

      <section className="rounded-2xl bg-cream/80 p-5 ring-1 ring-coral/10">
        <div className="flex items-center justify-between">
          <p className="font-display text-xl text-coral-dark">Booking</p>
          <Badge tone="info">{booking.status}</Badge>
        </div>
        <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
          <Row label="Service" value={`${service.name} · ${service.durationMin} min`} />
          <Row label="Therapist" value={therapist.name} />
          <Row label="Email" value={booking.customerEmail} />
          <Row label="Phone" value={booking.customerPhone} />
          {booking.notes && <Row label="Customer notes" value={booking.notes} />}
        </dl>
      </section>

      {booking.intakeFormData ? (
        <section className="rounded-2xl bg-cream/80 p-5 ring-1 ring-coral/10">
          <p className="font-display text-xl text-coral-dark">Intake form</p>
          <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
            {booking.intakeFormData.pressurePreference && (
              <Row label="Pressure" value={booking.intakeFormData.pressurePreference} />
            )}
            {booking.intakeFormData.problemAreas?.length ? (
              <Row label="Problem areas" value={booking.intakeFormData.problemAreas.join(", ")} />
            ) : null}
            {booking.intakeFormData.allergies && (
              <Row label="Allergies" value={booking.intakeFormData.allergies} />
            )}
            {booking.intakeFormData.medications && (
              <Row label="Medications" value={booking.intakeFormData.medications} />
            )}
            {booking.intakeFormData.healthConditions && (
              <Row label="Health" value={booking.intakeFormData.healthConditions} />
            )}
            {booking.intakeFormData.recentInjuries && (
              <Row label="Injuries" value={booking.intakeFormData.recentInjuries} />
            )}
            {booking.intakeFormData.firstVisit !== undefined && (
              <Row
                label="First visit?"
                value={booking.intakeFormData.firstVisit ? "Yes" : "No"}
              />
            )}
          </dl>
        </section>
      ) : (
        <section className="rounded-2xl border border-dashed border-coral/20 p-5 text-sm text-ink/60">
          Customer has not yet completed the intake form.
        </section>
      )}

      <section className="rounded-2xl bg-cream/80 p-5 ring-1 ring-coral/10">
        <p className="font-display text-xl text-coral-dark">Your private notes</p>
        <p className="mt-1 text-xs text-ink/60">
          Visible to staff only. Customer never sees these.
        </p>
        <TherapistNotesEditor
          bookingId={booking.id}
          initial={booking.therapistNotes ?? ""}
        />
      </section>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-ink/55">{label}</dt>
      <dd className="text-ink">{value}</dd>
    </div>
  );
}
