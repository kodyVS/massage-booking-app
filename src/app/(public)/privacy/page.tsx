import type { Metadata } from "next";
import { settingsController } from "@/backend";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How Vital Touch Massage collects, uses, and protects your personal information.",
};

export const dynamic = "force-dynamic";

/**
 * Privacy Policy.
 *
 * NOTE FOR LEGAL: this is a starter template. Have it reviewed before
 * launching to the public. It is not legal advice and may need adjustments
 * for your jurisdiction (CCPA, GDPR, HIPAA-adjacent health-intake data,
 * etc.). Search this file for `[LEGAL]` markers.
 */
export default async function PrivacyPage() {
  const settings = await settingsController.get();
  const updated = "2026-05-01"; // [LEGAL] bump on every meaningful change.

  return (
    <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <h1 className="font-display text-3xl text-coral-dark sm:text-4xl">
        Privacy Policy
      </h1>
      <p className="mt-2 text-sm text-ink/60">Last updated: {updated}</p>

      <Section title="What we collect">
        <p>
          When you book an appointment with {settings.businessName}, we collect:
        </p>
        <ul>
          <li>Your name, email address, and phone number.</li>
          <li>Appointment details (service, therapist, date, and time).</li>
          <li>
            Optional booking notes you provide and intake-form responses
            (pressure preference, allergies, medications, health conditions,
            pregnancy status, recent injuries, etc.).
          </li>
          <li>
            Limited technical data needed to operate the site (IP address,
            browser, timestamps) and to prevent abuse.
          </li>
        </ul>
      </Section>

      <Section title="How we use it">
        <ul>
          <li>To schedule, confirm, remind you about, and manage your appointments.</li>
          <li>
            To send transactional SMS and email about your booking. By
            providing your phone number you consent to booking-related SMS;
            you can reply <strong>STOP</strong> at any time to opt out.
          </li>
          <li>
            To prepare your therapist for your session (intake-form responses
            are visible to your assigned therapist and to {settings.businessName}{" "}
            administrators).
          </li>
          <li>
            To meet legal, accounting, and safety requirements (e.g.
            recordkeeping for licensed practitioners).
          </li>
        </ul>
      </Section>

      <Section title="Who we share it with">
        <p>
          We do not sell your information. We share it only with the service
          providers required to run the booking platform — our hosting
          provider, transactional SMS provider (Twilio), transactional email
          provider (Resend), and database provider (MongoDB Atlas). Each
          handles your data under their own privacy commitments.
        </p>
      </Section>

      <Section title="How long we keep it">
        <p>
          We retain booking records and intake-form responses for as long as
          required by your local rules for licensed massage practice (commonly
          several years). You can ask us to delete your contact details at any
          time; appointment records may be retained in anonymized form for
          accounting and audit. [LEGAL]
        </p>
      </Section>

      <Section title="Your choices">
        <ul>
          <li>
            <strong>SMS opt-out</strong>: reply STOP to any booking message.
          </li>
          <li>
            <strong>Email opt-out</strong>: contact us — note that
            booking-related email (confirmation, reminder, cancellation) is
            transactional and required to use the service.
          </li>
          <li>
            <strong>Access &amp; deletion</strong>: contact us at{" "}
            {settings.businessPhone || "the phone number in our footer"} or by
            email to request a copy of your data or its deletion.
          </li>
        </ul>
      </Section>

      <Section title="Contact">
        <p>
          {settings.businessName}
          {settings.businessAddress && (
            <>
              <br />
              {settings.businessAddress}
            </>
          )}
          {settings.businessPhone && (
            <>
              <br />
              {settings.businessPhone}
            </>
          )}
        </p>
      </Section>
    </article>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8 space-y-3 text-ink/80 [&>ul]:ml-5 [&>ul]:list-disc [&>ul]:space-y-1">
      <h2 className="font-display text-xl text-coral-dark">{title}</h2>
      {children}
    </section>
  );
}
