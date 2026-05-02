import type { Metadata } from "next";
import { settingsController } from "@/backend";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "The terms that govern your use of the Vital Touch Massage booking site.",
};

export const dynamic = "force-dynamic";

/**
 * Terms of Service.
 *
 * NOTE FOR LEGAL: this is a starter template. Have it reviewed before
 * launching to the public. Search this file for `[LEGAL]` markers.
 */
export default async function TermsPage() {
  const settings = await settingsController.get();
  const updated = "2026-05-01";

  return (
    <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <h1 className="font-display text-3xl text-coral-dark sm:text-4xl">
        Terms of Service
      </h1>
      <p className="mt-2 text-sm text-ink/60">Last updated: {updated}</p>

      <Section title="Booking">
        <p>
          Booking through {settings.businessName} reserves a time with your
          chosen therapist for the chosen service. Payment is collected at
          your visit; we do not process online payments. Prices shown are in
          U.S. dollars and may change.
        </p>
      </Section>

      <Section title="Cancellation policy">
        <p className="whitespace-pre-line">{settings.cancellationPolicy}</p>
      </Section>

      <Section title="No-shows and late arrivals">
        <p>
          If you miss your appointment without notice, we may apply a no-show
          fee or restrict future bookings at our discretion. If you arrive
          late, your session may be shortened so we can stay on schedule for
          subsequent clients; the full price still applies.
        </p>
      </Section>

      <Section title="Intake form &amp; medical disclosure">
        <p>
          You agree to provide accurate intake-form information, including
          relevant allergies, medications, injuries, and health conditions.
          Massage therapy is not a substitute for medical care; tell us if you
          have a condition that may need a doctor&apos;s clearance.
        </p>
      </Section>

      <Section title="Code of conduct">
        <p>
          {settings.businessName} is a professional therapeutic environment.
          Harassing, threatening, or sexually inappropriate behavior toward
          our therapists or staff results in immediate termination of the
          session (with no refund) and a permanent ban from future booking.
        </p>
      </Section>

      <Section title="Communications">
        <p>
          By providing your phone number you agree to receive booking-related
          SMS from us. Reply <strong>STOP</strong> at any time to opt out.
          Standard message and data rates may apply. Booking-related email
          (confirmation, reminder, cancellation) is transactional and required
          to use the service.
        </p>
      </Section>

      <Section title="Limitation of liability">
        <p>
          {settings.businessName} provides this booking site &quot;as is&quot;
          without warranties. To the fullest extent permitted by law, our
          liability for any claim arising from your use of the site is
          limited to the amount you paid for the most recent service. [LEGAL]
        </p>
      </Section>

      <Section title="Changes">
        <p>
          We may update these terms from time to time. The &quot;last
          updated&quot; date at the top of this page reflects the most recent
          revision. Continued use of the site after changes are posted means
          you accept the updated terms.
        </p>
      </Section>

      <Section title="Contact">
        <p>
          Questions? Contact {settings.businessName}
          {settings.businessPhone && <> at {settings.businessPhone}</>}.
        </p>
      </Section>
    </article>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8 space-y-3 text-ink/80">
      <h2 className="font-display text-xl text-coral-dark">{title}</h2>
      {children}
    </section>
  );
}
