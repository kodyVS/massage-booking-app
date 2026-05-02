/**
 * Shared layout + brand styling helpers for transactional emails.
 *
 * Files in `src/emails/` may ONLY import from third-party libraries and from
 * other files inside `src/emails/`. The dependency direction is enforced by
 * the ESLint boundary rules — keep it that way so the templates can be
 * extracted into a separate package or service later.
 */

const BRAND = {
  cream: "#FBF7F4",
  blush: "#F4D5CE",
  coral: "#E07A6B",
  coralDark: "#B85A4D",
  periwinkle: "#A9B8E0",
  ink: "#2A2D3A",
};

export const FONT_STACK_DISPLAY =
  '"Fraunces", "Iowan Old Style", Georgia, "Times New Roman", serif';
export const FONT_STACK_BODY =
  '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

export interface LayoutInput {
  preheader: string;
  heading: string;
  bodyHtml: string;
  ctaLabel?: string;
  ctaHref?: string;
  businessName: string;
}

/** Escape user-provided text before dropping it into the HTML body. */
export function esc(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Render a button anchor inline so the HTML works without a `<style>` block. */
export function button(label: string, href: string): string {
  return `
    <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 16px 0;">
      <tr>
        <td bgcolor="${BRAND.coral}" style="border-radius: 999px;">
          <a href="${esc(href)}"
             style="display:inline-block; padding:12px 22px; font-family:${FONT_STACK_BODY}; font-size:14px; font-weight:600; color:${BRAND.cream}; text-decoration:none; border-radius:999px;">
            ${esc(label)}
          </a>
        </td>
      </tr>
    </table>
  `.trim();
}

/** Brand-styled HTML email shell. Returns the full `<html>` document. */
export function renderLayout(input: LayoutInput): string {
  const cta =
    input.ctaLabel && input.ctaHref
      ? button(input.ctaLabel, input.ctaHref)
      : "";

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${esc(input.businessName)}</title>
    <link href="https://fonts.googleapis.com/css2?family=Fraunces:wght@400;500;600&family=Inter:wght@400;500;600&display=swap" rel="stylesheet" />
  </head>
  <body style="margin:0; padding:0; background-color:${BRAND.cream}; color:${BRAND.ink}; font-family:${FONT_STACK_BODY};">
    <span style="display:none; max-height:0; overflow:hidden; opacity:0; color:${BRAND.cream};">
      ${esc(input.preheader)}
    </span>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:${BRAND.cream};">
      <tr>
        <td align="center" style="padding: 32px 16px;">
          <table role="presentation" width="560" cellspacing="0" cellpadding="0" style="max-width:560px; width:100%; background-color:#ffffff; border-radius:16px; box-shadow: 0 1px 3px rgba(42,45,58,0.06);">
            <tr>
              <td style="padding: 28px 32px 8px 32px; border-bottom: 1px solid ${BRAND.blush};">
                <div style="font-family:${FONT_STACK_DISPLAY}; font-size:22px; color:${BRAND.coralDark}; font-weight:600;">
                  ${esc(input.businessName)}
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding: 28px 32px;">
                <h1 style="margin: 0 0 12px 0; font-family:${FONT_STACK_DISPLAY}; font-size:26px; line-height:1.2; color:${BRAND.ink}; font-weight:600;">
                  ${esc(input.heading)}
                </h1>
                <div style="font-family:${FONT_STACK_BODY}; font-size:15px; line-height:1.55; color:${BRAND.ink};">
                  ${input.bodyHtml}
                </div>
                ${cta}
              </td>
            </tr>
            <tr>
              <td style="padding: 16px 32px 28px 32px; border-top: 1px solid ${BRAND.blush}; font-family:${FONT_STACK_BODY}; font-size:12px; color:${BRAND.ink}99;">
                You're receiving this because you booked an appointment with ${esc(input.businessName)}.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export interface BookingFacts {
  customerFirstName: string;
  serviceName: string;
  therapistName: string;
  whenLong: string; // "Wednesday, May 6, 2026 at 3:00 PM PDT"
  durationLabel: string; // "60 min"
  priceLabel: string; // "$120"
  businessName: string;
  businessAddress?: string;
  businessPhone?: string;
  cancellationPolicy: string;
}

/** Reusable HTML "facts" table block — used by every template. */
export function bookingFactsHtml(f: BookingFacts): string {
  const rows: Array<[string, string]> = [
    ["When", f.whenLong],
    ["Service", `${f.serviceName} · ${f.durationLabel}`],
    ["Therapist", f.therapistName],
    ["Price", `${f.priceLabel} · pay at visit`],
  ];
  if (f.businessAddress) rows.push(["Location", f.businessAddress]);
  if (f.businessPhone) {
    const m = f.businessPhone.match(/^\+1(\d{3})(\d{3})(\d{4})$/);
    const pretty = m ? `(${m[1]}) ${m[2]}-${m[3]}` : f.businessPhone;
    rows.push(["Call or text", pretty]);
  }

  const tr = rows
    .map(
      ([k, v]) => `
        <tr>
          <td style="padding:6px 12px 6px 0; font-size:12px; text-transform:uppercase; letter-spacing:0.04em; color:${BRAND.ink}99; vertical-align:top;">${esc(k)}</td>
          <td style="padding:6px 0; font-size:14px; color:${BRAND.ink};">${esc(v)}</td>
        </tr>`,
    )
    .join("");

  return `
    <table role="presentation" cellspacing="0" cellpadding="0" style="background-color:${BRAND.blush}33; border-radius:12px; padding:14px 16px; width:100%; margin: 8px 0 4px 0;">
      <tr>
        <td>
          <table role="presentation" cellspacing="0" cellpadding="0" width="100%">
            ${tr}
          </table>
        </td>
      </tr>
    </table>
  `.trim();
}

export function policyBlock(label: string, body: string): string {
  return `
    <p style="margin: 18px 0 4px 0; font-size:12px; text-transform:uppercase; letter-spacing:0.04em; color:${BRAND.ink}99;">
      ${esc(label)}
    </p>
    <p style="margin: 0; font-size:13px; color:${BRAND.ink}cc; white-space:pre-line;">
      ${esc(body)}
    </p>
  `.trim();
}
