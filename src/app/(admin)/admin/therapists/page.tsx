import Link from "next/link";
import { therapistsController } from "@/backend";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty";
import { TherapistRowActions } from "./row-actions";

export const dynamic = "force-dynamic";

export default async function AdminTherapistsPage() {
  const therapists = await therapistsController.list({
    input: { activeOnly: false },
  });

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl text-coral-dark">Therapists</h1>
          <p className="text-sm text-ink/60">
            Manage your therapy team - they appear on the public site when active.
          </p>
        </div>
        <Link href="/admin/therapists/new">
          <Button>+ Add therapist</Button>
        </Link>
      </header>

      {therapists.length === 0 ? (
        <EmptyState
          title="No therapists yet"
          description="Add at least one to start accepting bookings."
        />
      ) : (
        <ul className="grid gap-3">
          {therapists.map((t) => (
            <li
              key={t.id}
              className="flex items-center justify-between gap-4 rounded-2xl bg-cream/80 p-4 ring-1 ring-coral/10"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate font-medium text-ink">{t.name}</p>
                  {t.active ? (
                    <Badge tone="success">Active</Badge>
                  ) : (
                    <Badge tone="neutral">Inactive</Badge>
                  )}
                </div>
                {t.specialties.length > 0 && (
                  <p className="mt-1 truncate text-xs text-ink/60">
                    {t.specialties.join(" · ")}
                  </p>
                )}
              </div>
              <TherapistRowActions therapist={t} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
