import Link from "next/link";
import { therapistsController } from "@/backend";
import { TherapistCard } from "@/components/therapist-card";

export const revalidate = 60;

export default async function BrowseByTherapistPage() {
  const therapists = await therapistsController.list({
    input: { activeOnly: true },
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <header className="mb-6 flex flex-col items-start gap-2">
        <Link
          href="/book"
          className="text-sm text-coral-dark hover:underline"
        >
          ← Back to services
        </Link>
        <h1 className="font-display text-4xl text-coral-dark sm:text-5xl">
          Browse our therapists
        </h1>
        <p className="text-ink/80">
          Pick a therapist below — or let us find the earliest opening across
          our team.
        </p>
      </header>

      <Link
        href="/book/any"
        className="mb-6 flex items-center justify-between gap-4 rounded-2xl bg-coral px-5 py-4 text-cream shadow-sm transition hover:bg-coral-dark"
      >
        <span>
          <span className="block font-display text-xl">Any therapist</span>
          <span className="block text-sm text-cream/85">
            See the earliest available slot across the team.
          </span>
        </span>
        <span aria-hidden="true" className="text-2xl">→</span>
      </Link>

      {therapists.length === 0 ? (
        <p className="text-center text-ink/70">
          No therapists are available yet.
        </p>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {therapists.map((t) => (
            <TherapistCard key={t.id} therapist={t} selectable />
          ))}
        </div>
      )}
    </div>
  );
}
