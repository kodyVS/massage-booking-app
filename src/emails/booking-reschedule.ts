import {
  bookingFactsHtml,
  esc,
  policyBlock,
  renderLayout,
  type BookingFacts,
} from "./_layout";

export interface BookingRescheduleInput extends BookingFacts {
  manageUrl: string;
  /** Original start time, formatted in business TZ — used for context only. */
  previousWhenLong?: string;
}

export function renderBookingReschedule(
  input: BookingRescheduleInput,
): { subject: string; html: string } {
  const subject = `Rescheduled: ${input.serviceName} now ${input.whenLong}`;

  const previousLine = input.previousWhenLong
    ? `<p style="margin: 0 0 8px 0; color:#2A2D3Acc;">Previously: ${esc(input.previousWhenLong)}.</p>`
    : "";

  const bodyHtml = `
    <p style="margin: 0 0 8px 0;">
      Hi ${esc(input.customerFirstName)}, your appointment with ${esc(input.therapistName)} has been rescheduled.
    </p>
    ${previousLine}
    ${bookingFactsHtml(input)}
    <p style="margin: 16px 0 8px 0;">
      Updated calendar invite attached.
    </p>
    ${policyBlock("Cancellation policy", input.cancellationPolicy)}
  `.trim();

  return {
    subject,
    html: renderLayout({
      preheader: `Now ${input.whenLong}.`,
      heading: "Your appointment was updated.",
      bodyHtml,
      ctaLabel: "Manage your booking",
      ctaHref: input.manageUrl,
      businessName: input.businessName,
    }),
  };
}
