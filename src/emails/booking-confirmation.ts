import {
  bookingFactsHtml,
  esc,
  policyBlock,
  renderLayout,
  type BookingFacts,
} from "./_layout";

export interface BookingConfirmationInput extends BookingFacts {
  manageUrl: string;
  /** Optional intake-form magic link (only set when settings.intakeRequired is true). */
  intakeUrl?: string;
}

export function renderBookingConfirmation(
  input: BookingConfirmationInput,
): { subject: string; html: string } {
  const subject = `Your ${input.serviceName} is confirmed - ${input.whenLong}`;

  const intakeLine = input.intakeUrl
    ? `
      <p style="margin: 16px 0 8px 0;">
        Please <a href="${esc(input.intakeUrl)}" style="color:#B85A4D; text-decoration:underline;">complete your intake form</a>
        before your visit so your therapist can prepare.
      </p>`
    : "";

  const bodyHtml = `
    <p style="margin: 0 0 14px 0;">
      Hi ${esc(input.customerFirstName)}, your appointment with ${esc(input.therapistName)} is confirmed.
    </p>
    ${bookingFactsHtml(input)}
    ${intakeLine}
    <p style="margin: 16px 0 8px 0;">
      We've attached an .ics file you can drop into your calendar.
    </p>
    ${policyBlock("Cancellation policy", input.cancellationPolicy)}
  `.trim();

  return {
    subject,
    html: renderLayout({
      preheader: `Your ${input.serviceName} is confirmed for ${input.whenLong}.`,
      heading: "You're booked.",
      bodyHtml,
      ctaLabel: "Manage your booking",
      ctaHref: input.manageUrl,
      businessName: input.businessName,
    }),
  };
}
