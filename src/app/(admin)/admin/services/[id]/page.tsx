import Link from "next/link";
import { notFound } from "next/navigation";
import {
  NotFoundError,
  servicesController,
  therapistsController,
} from "@/backend";
import { ServiceForm } from "@/components/portal/service-form";

export const dynamic = "force-dynamic";

export default async function EditServicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let service;
  try {
    service = await servicesController.get({ input: { id } });
  } catch (err) {
    if (err instanceof NotFoundError) notFound();
    throw err;
  }
  const therapists = await therapistsController.list({ input: { activeOnly: false } });
  // Find which therapists are linked.
  const linkedTherapistIds = (
    await Promise.all(
      therapists.map(async (t) => {
        const ss = await servicesController.list({
          input: { therapistId: t.id, activeOnly: false },
        });
        return ss.some((s) => s.id === id) ? t.id : null;
      }),
    )
  ).filter((x): x is string => x !== null);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link href="/admin/services" className="text-xs text-coral-dark hover:underline">
          ← Back
        </Link>
        <h1 className="mt-1 font-display text-3xl text-coral-dark">{service.name}</h1>
      </div>
      <ServiceForm
        initial={service}
        initialTherapistIds={linkedTherapistIds}
        therapists={therapists}
      />
    </div>
  );
}
