import Link from "next/link";
import type { ServiceDTO } from "@/backend";
import { formatDuration, formatPrice } from "@/lib/format";

interface Props {
  service: ServiceDTO;
}

/**
 * Service tile for the service-first booking grid (`/book`). Wraps the
 * existing presentational `<ServiceCard>` look in a clickable Link to
 * `/book/service/[id]` so the user can jump straight to date+slot picking.
 *
 * Kept here (rather than extending `<ServiceCard>`) so the read-only
 * presentational card can stay reusable for the homepage / admin views.
 */
export function ServiceBookingCard({ service }: Props) {
  return (
    <Link
      href={`/book/service/${service.id}`}
      className="group flex h-full flex-col gap-2 rounded-2xl bg-blush/40 p-5 ring-1 ring-coral/15 transition hover:ring-coral hover:shadow-sm"
    >
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="font-display text-xl text-coral-dark">{service.name}</h3>
        <span className="text-sm font-semibold text-coral-dark">
          {formatPrice(service.price)}
        </span>
      </div>
      <p className="text-xs uppercase tracking-wide text-ink/60">
        {formatDuration(service.durationMin)}
      </p>
      {service.description && (
        <p className="mt-1 text-sm text-ink/80">{service.description}</p>
      )}
      <p className="mt-auto pt-3 text-sm font-semibold text-coral-dark/90 transition group-hover:text-coral-dark">
        Pick a time →
      </p>
    </Link>
  );
}
