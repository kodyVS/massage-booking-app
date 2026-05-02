import Link from "next/link";

/**
 * On-brand 404. Rendered for any unmatched route. Kept as a server component
 * with no DB calls so it works even if Mongo is unreachable.
 */
export default function NotFound() {
  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center px-4 text-center">
      <p className="font-display text-6xl font-semibold text-coral">404</p>
      <h1 className="mt-4 font-display text-3xl text-coral-dark sm:text-4xl">
        We couldn&apos;t find that page.
      </h1>
      <p className="mt-3 max-w-md text-ink/75">
        The link may have moved, or the appointment you were looking for is no
        longer available. Let&apos;s get you back on track.
      </p>
      <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
        <Link
          href="/"
          className="rounded-full bg-coral px-6 py-3 text-sm font-semibold text-cream shadow-sm transition hover:bg-coral-dark"
        >
          Go home
        </Link>
        <Link
          href="/book"
          className="rounded-full border border-coral/30 px-6 py-3 text-sm font-medium text-coral-dark transition hover:bg-blush/60"
        >
          Book a massage
        </Link>
      </div>
    </div>
  );
}
