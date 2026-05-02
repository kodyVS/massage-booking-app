"use client";

/**
 * Last-resort error boundary. Renders when the root layout itself throws
 * (so the chrome from `app/layout.tsx` is unavailable). Inline styles only.
 */
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[global-error]", error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem",
          background: "#FBF7F4",
          color: "#2A2D3A",
          fontFamily: "system-ui, sans-serif",
          textAlign: "center",
        }}
      >
        <h1 style={{ fontSize: "2rem", color: "#B85A4D", marginBottom: "0.5rem" }}>
          We&apos;re having trouble loading the site.
        </h1>
        <p style={{ maxWidth: 480, color: "rgba(42,45,58,0.75)" }}>
          Please refresh in a moment. If the problem persists, give us a call
          and we&apos;ll get you booked.
        </p>
        {error.digest && (
          <p style={{ marginTop: 8, fontSize: 12, opacity: 0.6 }}>
            Reference: {error.digest}
          </p>
        )}
        <button
          type="button"
          onClick={reset}
          style={{
            marginTop: 24,
            padding: "0.75rem 1.5rem",
            borderRadius: 9999,
            background: "#E07A6B",
            color: "#FBF7F4",
            border: "none",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
