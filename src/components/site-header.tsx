import Link from "next/link";

interface Props {
  businessName: string;
}

/** Top-of-page header for public pages. Sticky, brand-colored, mobile-first. */
export function SiteHeader({ businessName }: Props) {
  return (
    <header className="sticky top-0 z-30 w-full border-b border-coral/10 bg-cream/85 backdrop-blur supports-[backdrop-filter]:bg-cream/70">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6 sm:py-4">
        <Link
          href="/"
          className="font-display text-xl font-semibold text-coral-dark sm:text-2xl"
        >
          {businessName}
        </Link>
        <nav className="flex items-center gap-2 sm:gap-4">
          <Link
            href="/#services"
            className="hidden rounded px-3 py-2 text-sm font-medium text-ink/80 hover:text-coral-dark sm:inline-block"
          >
            Services
          </Link>
          <Link
            href="/#therapists"
            className="hidden rounded px-3 py-2 text-sm font-medium text-ink/80 hover:text-coral-dark sm:inline-block"
          >
            Therapists
          </Link>
          <Link
            href="/#faq"
            className="hidden rounded px-3 py-2 text-sm font-medium text-ink/80 hover:text-coral-dark sm:inline-block"
          >
            FAQ
          </Link>
          <Link
            href="/book"
            className="rounded-full bg-coral px-4 py-2 text-sm font-semibold text-cream shadow-sm transition hover:bg-coral-dark"
          >
            Book Now
          </Link>
        </nav>
      </div>
    </header>
  );
}
