import {
  bookingFactsHtml,
  esc,
  policyBlock,
  renderLayout,
  type BookingFacts,
} from "./_layout";

export interface BookingReminderInput extends BookingFacts {
  manageUrl: string;
}

export function renderBookingReminder(
  input: BookingReminderInput,
): { subject: string; html: string } {
  const subject = `Reminder: ${input.serviceName} tomorrow at ${input.whenLong.split(" at ")[1] ?? input.whenLong}`;

  const bodyHtml = `
    <p style="margin: 0 0 14px 0;">
      Hi ${esc(input.customerFirstName)}, a quick reminder of your upcoming appointment with ${esc(input.therapistName)}.
    </p>
    ${bookingFactsHtml(input)}
    <p style="margin: 16px 0 8px 0;">
      Need to make a change? Use the button below.
    </p>
    ${policyBlock("Cancellation policy", input.cancellationPolicy)}
  `.trim();

  return {
    subject,
    html: renderLayout({
      preheader: `See you ${input.whenLong}.`,
      heading: "See you soon.",
      bodyHtml,
      ctaLabel: "Manage your booking",
      ctaHref: input.manageUrl,
      businessName: input.businessName,
    }),
  };
}
