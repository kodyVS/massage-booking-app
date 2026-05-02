import Link from "next/link";
import { notFound } from "next/navigation";
import {
  bookingsController,
  NotFoundError,
  servicesController,
  settingsController,
  therapistsController,
} from "@/backend";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/format";
import { TherapistNotesEditor } from "@/components/portal/therapist-notes-editor";
import { BookingDetailActions } from "./detail-actions";

export const dynamic = "force-dynamic";

export default async function AdminBookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let booking;
  try {
    booking = await bookingsController.get({ input: { id } });
  } catch (err) {
    if (err instanceof NotFoundError) notFound();
    throw err;
  }
  const [therapist, service, settings] = await Promise.all([
    therapistsController.get({ input: { id: booking.therapistId } }),
    servicesController.get({ input: { id: booking.serviceId } }),
    settingsController.get(),
  ]);
  const tz = settings.businessTimezone;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link href="/admin/bookings" className="text-xs text-coral-dark hover:underline">
          ← Back
        </Link>
        <h1 className="mt-1 font-display text-3xl text-coral-dark">
          {booking.customerName}
        </h1>
        <p className="text-sm text-ink/65">
          {formatDateTime(booking.startAt, tz)}
        </p>
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
          {booking.notes && <Row label="Notes" value={booking.notes} />}
        </dl>
      </section>

      {booking.intakeFormData && (
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
      )}

      <section className="rounded-2xl bg-cream/80 p-5 ring-1 ring-coral/10">
        <p className="font-display text-xl text-coral-dark">
          Therapist private notes
        </p>
        <p className="mt-1 text-xs text-ink/60">
          Visible to staff only. Customer never sees these.
        </p>
        <TherapistNotesEditor
          bookingId={booking.id}
          initial={booking.therapistNotes ?? ""}
        />
      </section>

      <section className="rounded-2xl bg-cream/80 p-5 ring-1 ring-coral/10">
        <p className="font-display text-xl text-coral-dark">Manage</p>
        <p className="mt-1 text-xs text-ink/60">
          Reschedule, cancel, or update status.
        </p>
        <BookingDetailActions booking={booking} />
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
