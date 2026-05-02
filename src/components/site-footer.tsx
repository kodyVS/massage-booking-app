import Link from "next/link";

interface Props {
  businessName: string;
  businessPhone: string;
  businessAddress: string;
}

function formatPhone(e164: string): string {
  const m = e164.match(/^\+1(\d{3})(\d{3})(\d{4})$/);
  return m ? `(${m[1]}) ${m[2]}-${m[3]}` : e164;
}

export function SiteFooter({ businessName, businessPhone, businessAddress }: Props) {
  return (
    <footer className="mt-16 border-t border-coral/10 bg-blush/30">
      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-10 sm:grid-cols-4 sm:px-6">
        <div>
          <h3 className="font-display text-lg font-semibold text-coral-dark">
            {businessName}
          </h3>
          <p className="mt-2 text-sm text-ink/80">
            Therapeutic massage in a calm, watercolor space.
          </p>
        </div>
        <div className="text-sm text-ink/80">
          <h4 className="font-semibold text-coral-dark">Visit</h4>
          {businessAddress ? (
            <p className="mt-2 whitespace-pre-line">{businessAddress}</p>
          ) : (
            <p className="mt-2">Address coming soon.</p>
          )}
          {businessPhone && (
            <p className="mt-2">
              Call or text{" "}
              <a className="underline-offset-4 hover:underline" href={`tel:${businessPhone}`}>
                {formatPhone(businessPhone)}
              </a>
            </p>
          )}
        </div>
        <div className="text-sm text-ink/80">
          <h4 className="font-semibold text-coral-dark">Hours</h4>
          <p className="mt-2">Mon – Fri · 9:00 AM – 5:00 PM</p>
          <p>Sat · 10:00 AM – 4:00 PM</p>
          <p>Sun · 11:00 AM – 3:00 PM</p>
        </div>
        <nav aria-label="Legal" className="text-sm text-ink/80">
          <h4 className="font-semibold text-coral-dark">Legal</h4>
          <ul className="mt-2 space-y-1">
            <li>
              <Link
                href="/privacy"
                className="underline-offset-4 hover:underline"
              >
                Privacy policy
              </Link>
            </li>
            <li>
              <Link
                href="/terms"
                className="underline-offset-4 hover:underline"
              >
                Terms of service
              </Link>
            </li>
          </ul>
        </nav>
      </div>
      <div className="border-t border-coral/10 px-4 py-4 text-center text-xs text-ink/60 sm:px-6">
        © {new Date().getFullYear()} {businessName}. All rights reserved.
      </div>
    </footer>
  );
}
