import Link from "next/link";
import { notFound } from "next/navigation";
import { therapistsController, NotFoundError } from "@/backend";
import { TherapistForm } from "@/components/portal/therapist-form";

export const dynamic = "force-dynamic";

export default async function EditTherapistPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let therapist;
  try {
    therapist = await therapistsController.get({ input: { id } });
  } catch (err) {
    if (err instanceof NotFoundError) notFound();
    throw err;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link href="/admin/therapists" className="text-xs text-coral-dark hover:underline">
          ← Back
        </Link>
        <h1 className="mt-1 font-display text-3xl text-coral-dark">{therapist.name}</h1>
      </div>
      <TherapistForm initial={therapist} />
    </div>
  );
}
