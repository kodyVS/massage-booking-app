"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";

export interface FaqItem {
  question: string;
  answer: string;
}

interface Props {
  items: FaqItem[];
}

export function FaqAccordion({ items }: Props) {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <ul className="divide-y divide-coral/10 rounded-2xl bg-cream/70 ring-1 ring-coral/10">
      {items.map((item, i) => {
        const isOpen = open === i;
        return (
          <li key={item.question}>
            <button
              type="button"
              aria-expanded={isOpen}
              onClick={() => setOpen(isOpen ? null : i)}
              className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-base font-medium text-coral-dark"
            >
              <span>{item.question}</span>
              <span
                aria-hidden="true"
                className={cn(
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blush text-coral-dark transition-transform",
                  isOpen && "rotate-45",
                )}
              >
                +
              </span>
            </button>
            {isOpen && (
              <div className="px-5 pb-5 text-sm text-ink/85 whitespace-pre-line">
                {item.answer}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
