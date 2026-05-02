"use client";

import type { ServiceDTO } from "@/backend";
import { cn } from "@/lib/cn";
import { formatDuration, formatPrice } from "@/lib/format";

interface Props {
  services: ServiceDTO[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function ServicePicker({ services, selectedId, onSelect }: Props) {
  return (
    <div role="radiogroup" aria-label="Choose a service" className="grid gap-3 sm:grid-cols-2">
      {services.map((s) => {
        const checked = selectedId === s.id;
        return (
          <button
            key={s.id}
            type="button"
            role="radio"
            aria-checked={checked}
            onClick={() => onSelect(s.id)}
            className={cn(
              "flex flex-col gap-1 rounded-2xl bg-cream/90 p-4 text-left ring-1 ring-coral/15 transition",
              checked
                ? "ring-2 ring-coral shadow-sm"
                : "hover:ring-coral/40",
            )}
          >
            <div className="flex items-baseline justify-between">
              <span className="font-display text-lg text-coral-dark">{s.name}</span>
              <span className="text-sm font-semibold text-coral-dark">
                {formatPrice(s.price)}
              </span>
            </div>
            <span className="text-xs uppercase tracking-wide text-ink/60">
              {formatDuration(s.durationMin)}
            </span>
            {s.description && (
              <span className="text-sm text-ink/80">{s.description}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
