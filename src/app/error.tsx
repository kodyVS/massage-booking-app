"use client";

/**
 * App-router segment error boundary. Catches uncaught exceptions thrown
 * during rendering of any route and shows an on-brand fallback.
 *
 * `global-error.tsx` is the last-resort fallback when the root layout itself
 * fails — this file handles everything else.
 */
import { useEffect } from "react";
import Link from "next/link";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surface to server logs (Vercel captures these).
    console.error("[error-boundary]", error);
  }, [error]);

  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center px-4 text-center">
      <p className="font-display text-5xl font-semibold text-coral">
        Something went sideways.
      </p>
      <p className="mt-4 max-w-md text-ink/75">
        We hit an unexpected error. Try again, and if it keeps happening, give
        us a call — we&apos;ll get you sorted.
      </p>
      {error.digest && (
        <p className="mt-2 text-xs text-ink/50">Reference: {error.digest}</p>
      )}
      <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
        <button
          type="button"
          onClick={reset}
          className="rounded-full bg-coral px-6 py-3 text-sm font-semibold text-cream shadow-sm transition hover:bg-coral-dark"
        >
          Try again
        </button>
        <Link
          href="/"
          className="rounded-full border border-coral/30 px-6 py-3 text-sm font-medium text-coral-dark transition hover:bg-blush/60"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}
