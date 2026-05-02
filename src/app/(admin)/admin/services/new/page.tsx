import Link from "next/link";
import { therapistsController } from "@/backend";
import { ServiceForm } from "@/components/portal/service-form";

export const dynamic = "force-dynamic";

export default async function NewServicePage() {
  const therapists = await therapistsController.list({ input: { activeOnly: false } });
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link href="/admin/services" className="text-xs text-coral-dark hover:underline">
          ← Back
        </Link>
        <h1 className="mt-1 font-display text-3xl text-coral-dark">Add service</h1>
      </div>
      <ServiceForm therapists={therapists} />
    </div>
  );
}
