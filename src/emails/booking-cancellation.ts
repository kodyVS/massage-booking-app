import {
  bookingFactsHtml,
  esc,
  renderLayout,
  type BookingFacts,
} from "./_layout";

export interface BookingCancellationInput extends BookingFacts {
  bookingUrl: string;
}

export function renderBookingCancellation(
  input: BookingCancellationInput,
): { subject: string; html: string } {
  const subject = `Cancelled: ${input.serviceName} on ${input.whenLong}`;

  const bodyHtml = `
    <p style="margin: 0 0 14px 0;">
      Hi ${esc(input.customerFirstName)}, your appointment has been cancelled.
    </p>
    ${bookingFactsHtml(input)}
    <p style="margin: 16px 0 0 0;">
      We'd love to see you again whenever you're ready to rebook.
    </p>
  `.trim();

  return {
    subject,
    html: renderLayout({
      preheader: `Your ${input.serviceName} on ${input.whenLong} has been cancelled.`,
      heading: "Your appointment is cancelled.",
      bodyHtml,
      ctaLabel: "Book a new session",
      ctaHref: input.bookingUrl,
      businessName: input.businessName,
    }),
  };
}
