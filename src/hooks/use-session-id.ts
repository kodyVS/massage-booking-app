"use client";

import { useSyncExternalStore } from "react";

const KEY = "vt:sessionId";

function subscribe(): () => void {
  // Session id is generated once and never changes within a tab — no need to
  // subscribe to anything. Return a no-op unsubscribe.
  return () => {};
}

/**
 * `crypto.randomUUID` is only exposed in secure contexts (HTTPS, localhost,
 * 127.0.0.1). When the dev server is accessed over a LAN/Tailscale IP, it
 * is undefined. Fall back to a non-cryptographic pseudo-random id — the
 * session id only needs to be unique per tab for hold ownership, not
 * unguessable.
 */
function generateId(): string {
  const c = (
    typeof globalThis !== "undefined"
      ? (globalThis as { crypto?: Crypto }).crypto
      : undefined
  );
  if (c?.randomUUID) return c.randomUUID();
  // Fallback: timestamp + 12 random hex chars.
  const rand = Array.from({ length: 12 }, () =>
    Math.floor(Math.random() * 16).toString(16),
  ).join("");
  return `${Date.now().toString(16)}-${rand}`;
}

function getSnapshot(): string {
  let v = window.localStorage.getItem(KEY);
  if (!v) {
    v = generateId();
    window.localStorage.setItem(KEY, v);
  }
  return v;
}

function getServerSnapshot(): null {
  return null;
}

/**
 * Stable per-browser session id used as the holder identity for booking
 * holds. Uses `useSyncExternalStore` so the value is read at render time
 * (with a null SSR snapshot) instead of via a setState-in-effect.
 */
export function useSessionId(): string | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
