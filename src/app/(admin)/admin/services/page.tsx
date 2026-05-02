import Link from "next/link";
import { servicesController } from "@/backend";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty";
import { formatDuration, formatPrice } from "@/lib/format";
import { ServiceRowActions } from "./row-actions";

export const dynamic = "force-dynamic";

export default async function AdminServicesPage() {
  const services = await servicesController.list({ input: { activeOnly: false } });

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl text-coral-dark">Services</h1>
          <p className="text-sm text-ink/60">
            Catalog of massages customers can book.
          </p>
        </div>
        <Link href="/admin/services/new">
          <Button>+ Add service</Button>
        </Link>
      </header>

      {services.length === 0 ? (
        <EmptyState
          title="No services configured"
          description="Add at least one service to enable bookings."
        />
      ) : (
        <ul className="grid gap-3">
          {services.map((s) => (
            <li
              key={s.id}
              className="flex items-center justify-between gap-4 rounded-2xl bg-cream/80 p-4 ring-1 ring-coral/10"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate font-medium text-ink">{s.name}</p>
                  {s.active ? (
                    <Badge tone="success">Active</Badge>
                  ) : (
                    <Badge tone="neutral">Inactive</Badge>
                  )}
                </div>
                <p className="mt-1 text-xs text-ink/60">
                  {formatDuration(s.durationMin)} · {formatPrice(s.price)}
                </p>
              </div>
              <ServiceRowActions service={s} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
