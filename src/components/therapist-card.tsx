import Image from "next/image";
import Link from "next/link";
import type { TherapistDTO } from "@/backend";

interface Props {
  therapist: TherapistDTO;
  /** Wraps the card in a `/book/[id]` link when true. */
  selectable?: boolean;
}

export function TherapistCard({ therapist, selectable }: Props) {
  const initials = therapist.name
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const inner = (
    <article className="flex h-full flex-col gap-3 rounded-2xl bg-cream/80 p-5 ring-1 ring-coral/10 transition hover:ring-coral/30">
      <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-blush/60">
        {therapist.photoUrl ? (
          <Image
            src={therapist.photoUrl}
            alt={`Photo of ${therapist.name}`}
            fill
            sizes="(max-width: 640px) 100vw, 320px"
            className="object-cover"
          />
        ) : (
          <div
            aria-hidden="true"
            className="flex h-full w-full items-center justify-center font-display text-5xl text-coral-dark"
          >
            {initials || "VT"}
          </div>
        )}
      </div>
      <div>
        <h3 className="font-display text-xl text-coral-dark">{therapist.name}</h3>
        {therapist.specialties.length > 0 && (
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {therapist.specialties.slice(0, 4).map((s) => (
              <li
                key={s}
                className="rounded-full bg-periwinkle/40 px-2.5 py-0.5 text-xs text-ink/85"
              >
                {s}
              </li>
            ))}
          </ul>
        )}
        {therapist.bio && (
          <p className="mt-3 line-clamp-3 text-sm text-ink/80">
            {therapist.bio}
          </p>
        )}
      </div>
      {selectable && (
        <span className="mt-auto inline-flex w-fit items-center gap-1 rounded-full bg-coral px-3 py-1.5 text-sm font-semibold text-cream">
          Book {therapist.name.split(" ")[0]} →
        </span>
      )}
    </article>
  );

  if (selectable) {
    return (
      <Link
        href={`/book/${therapist.id}`}
        className="block h-full focus-visible:outline-2 focus-visible:outline-periwinkle"
      >
        {inner}
      </Link>
    );
  }
  return inner;
}
