import Link from "next/link";
import { TherapistForm } from "@/components/portal/therapist-form";

export default function NewTherapistPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link href="/admin/therapists" className="text-xs text-coral-dark hover:underline">
          ← Back
        </Link>
        <h1 className="mt-1 font-display text-3xl text-coral-dark">Add therapist</h1>
      </div>
      <TherapistForm />
    </div>
  );
}
