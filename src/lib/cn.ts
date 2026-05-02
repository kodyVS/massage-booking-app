import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Class-name merger used by every UI component (shadcn-style).
 * Combines `clsx` (conditionals) with `tailwind-merge` (conflict resolution).
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
