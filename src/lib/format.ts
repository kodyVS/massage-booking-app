import { formatInTimeZone } from "date-fns-tz";

/** Format an ISO UTC string in the business timezone for human-readable display. */
export function formatInTz(iso: string, tz: string, pattern: string): string {
  return formatInTimeZone(new Date(iso), tz, pattern);
}

export function formatTime(iso: string, tz: string): string {
  return formatInTz(iso, tz, "h:mm a");
}

export function formatDate(iso: string, tz: string): string {
  return formatInTz(iso, tz, "EEE, MMM d, yyyy");
}

export function formatDateTime(iso: string, tz: string): string {
  return formatInTz(iso, tz, "EEE, MMM d, yyyy 'at' h:mm a");
}

/** USD formatting; service prices are stored as plain numbers. */
export function formatPrice(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(amount);
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} hr` : `${h} hr ${m} min`;
}

/** Build a YYYY-MM-DD string interpreted in the given timezone. */
export function toBusinessDate(iso: string, tz: string): string {
  return formatInTimeZone(new Date(iso), tz, "yyyy-MM-dd");
}
