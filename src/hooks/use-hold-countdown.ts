"use client";

import { useEffect, useState } from "react";

interface UseHoldCountdownResult {
  /** Remaining seconds, clamped to 0. */
  remainingSec: number;
  /** True when the hold has expired (remainingSec === 0). */
  expired: boolean;
  /** Formatted "M:SS" display. */
  display: string;
}

/**
 * Polls every second to surface a countdown for a slot hold's expiresAt.
 * Pass `null` to disable the timer.
 */
export function useHoldCountdown(
  expiresAtIso: string | null,
): UseHoldCountdownResult {
  const [now, setNow] = useState<number>(() => Date.now());
  useEffect(() => {
    if (!expiresAtIso) return;
    const tick = () => setNow(Date.now());
    tick();
    const handle = window.setInterval(tick, 1000);
    return () => window.clearInterval(handle);
  }, [expiresAtIso]);

  if (!expiresAtIso) {
    return { remainingSec: 0, expired: true, display: "0:00" };
  }
  const remainingMs = new Date(expiresAtIso).getTime() - now;
  const remainingSec = Math.max(0, Math.floor(remainingMs / 1000));
  const m = Math.floor(remainingSec / 60);
  const s = remainingSec % 60;
  return {
    remainingSec,
    expired: remainingSec === 0,
    display: `${m}:${String(s).padStart(2, "0")}`,
  };
}
