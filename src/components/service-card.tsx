import Link from "next/link";
import type { ServiceDTO } from "@/backend";
import { formatDuration, formatPrice } from "@/lib/format";

interface Props {
  service: ServiceDTO;
  /** Wraps the card in a `/book/service/[id]` link when true. */
  selectable?: boolean;
}

export function ServiceCard({ service, selectable }: Props) {
  const inner = (
    <article className="flex h-full flex-col gap-2 rounded-2xl bg-blush/40 p-5 ring-1 ring-coral/10 transition hover:ring-coral/30 hover:bg-blush/55">
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
      {selectable && (
        <span className="mt-auto inline-flex w-fit items-center gap-1 pt-3 text-sm font-semibold text-coral-dark">
          Book this →
        </span>
      )}
    </article>
  );

  if (selectable) {
    return (
      <Link
        href={`/book/service/${service.id}`}
        className="block h-full focus-visible:outline-2 focus-visible:outline-periwinkle"
        aria-label={`Book ${service.name}`}
      >
        {inner}
      </Link>
    );
  }
  return inner;
}
