import Image from "next/image";
import Link from "next/link";
import {
  servicesController,
  settingsController,
  therapistsController,
} from "@/backend";
import { ServiceCard } from "@/components/service-card";
import { TherapistCard } from "@/components/therapist-card";
import { FaqAccordion, type FaqItem } from "@/components/faq-accordion";

// Cache the rendered page for 60s (ISR). Therapist + service catalogs
// change infrequently; the booking flow itself fetches live availability
// client-side. This keeps the home page off the per-request function pile.
export const revalidate = 60;

export default async function HomePage() {
  const [services, therapists, settings] = await Promise.all([
    servicesController.list({ input: { activeOnly: true } }),
    therapistsController.list({ input: { activeOnly: true } }),
    settingsController.get(),
  ]);

  // TODO(public-fe): make testimonials CMS-driven once admin UI ships.
  const testimonials = [
    {
      quote:
        "I came in with months of shoulder tension and walked out feeling weightless. The space itself is so calming.",
      author: "Hana M.",
    },
    {
      quote:
        "Best deep-tissue I've had in years. They actually listened to where I was hurting.",
      author: "Devon R.",
    },
    {
      quote:
        "Booked the couples massage for our anniversary - the room felt like a quiet little garden.",
      author: "Priya & Kabir S.",
    },
  ];

  const faqs: FaqItem[] = [
    {
      question: "What should I wear?",
      answer:
        "Whatever's comfortable. You'll undress to your comfort level in private and be draped throughout the session - only the area being worked on is exposed.",
    },
    {
      question: "Where do I park?",
      answer:
        "Street parking is available out front. Most appointments don't run into the metered hours.",
    },
    {
      question: "It's my first visit - what should I expect?",
      answer:
        "You'll arrive a few minutes early to fill out a short intake (or fill it from the magic link in your confirmation email), chat briefly with your therapist about pressure and any sore spots, then settle in.",
    },
    {
      question: "Cancellation policy",
      answer: settings.cancellationPolicy,
    },
  ];

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 pt-12 pb-20 sm:px-6 sm:pt-16 lg:grid-cols-2 lg:pt-24">
          <div className="text-center lg:text-left">
            <h1 className="font-display text-4xl leading-tight text-coral-dark sm:text-5xl lg:text-6xl">
              {settings.businessName}
            </h1>
            <p className="mt-4 text-lg text-ink/80 sm:text-xl">
              Therapeutic massage in a calm, welcoming space. Book in under
              two minutes - pay at your visit.
            </p>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center lg:justify-start">
              <Link
                href="/book"
                className="rounded-full bg-coral px-6 py-3 text-base font-semibold text-cream shadow-sm transition hover:bg-coral-dark"
              >
                Book Now
              </Link>
              <Link
                href="#services"
                className="rounded-full border border-coral/30 px-6 py-3 text-base font-medium text-coral-dark transition hover:bg-blush/60"
              >
                Explore services
              </Link>
            </div>
          </div>
          <div className="relative mx-auto aspect-square w-full max-w-md">
            <Image
              src="https://res.cloudinary.com/dwjjrobot/image/upload/v1777697281/file_000000006fec71fdb970fb3f904a52aa_uj4cao.png"
              alt="Vital Touch Massage logo."
              fill
              priority
              sizes="(min-width: 1024px) 28rem, 100vw"
              className="object-contain"
            />
          </div>
        </div>
      </section>

      {/* Services */}
      <section id="services" className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="mb-8 text-center">
          <h2 className="font-display text-3xl text-coral-dark sm:text-4xl">
            Our services
          </h2>
          <p className="mt-2 text-ink/80">Pay at your visit. No online payments.</p>
        </div>
        {services.length === 0 ? (
          <p className="text-center text-ink/70">
            New services are coming soon. Check back shortly.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {services.map((s) => (
              <ServiceCard key={s.id} service={s} selectable />
            ))}
          </div>
        )}
      </section>

      {/* Therapists */}
      <section
        id="therapists"
        className="bg-blush/30 py-12 sm:py-16"
        aria-labelledby="therapists-heading"
      >
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mb-8 text-center">
            <h2
              id="therapists-heading"
              className="font-display text-3xl text-coral-dark sm:text-4xl"
            >
              Meet our therapists
            </h2>
            <p className="mt-2 text-ink/80">
              Licensed, experienced, and ready to help you feel better.
            </p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {therapists.map((t) => (
              <TherapistCard key={t.id} therapist={t} selectable />
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        <h2 className="text-center font-display text-3xl text-coral-dark sm:text-4xl">
          What clients say
        </h2>
        {/* TODO(public-fe): replace with CMS-driven testimonials when admin UI ships. */}
        <div className="mt-8 grid gap-5 sm:grid-cols-3">
          {testimonials.map((t) => (
            <figure
              key={t.author}
              className="rounded-2xl bg-cream/80 p-5 ring-1 ring-coral/10"
            >
              <blockquote className="text-sm leading-relaxed text-ink/85">
                <span aria-hidden="true" className="font-display text-3xl leading-none text-coral">“</span>
                <span className="ml-1 align-top">{t.quote}</span>
              </blockquote>
              <figcaption className="mt-3 text-sm font-medium text-coral-dark">
                - {t.author}
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section
        id="faq"
        className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16"
        aria-labelledby="faq-heading"
      >
        <h2
          id="faq-heading"
          className="text-center font-display text-3xl text-coral-dark sm:text-4xl"
        >
          Good to know
        </h2>
        <div className="mt-8">
          <FaqAccordion items={faqs} />
        </div>
      </section>
    </>
  );
}
