"use client";

import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

const FIELD_BASE =
  "w-full rounded-xl border border-coral/20 bg-cream px-3 py-2 text-sm text-ink placeholder:text-ink/40 focus-visible:outline-2 focus-visible:outline-periwinkle disabled:cursor-not-allowed disabled:bg-blush/30 disabled:text-ink/60";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...rest }, ref) {
    return <input ref={ref} className={cn(FIELD_BASE, className)} {...rest} />;
  },
);

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, rows = 4, ...rest }, ref) {
  return (
    <textarea
      ref={ref}
      rows={rows}
      className={cn(FIELD_BASE, "resize-y", className)}
      {...rest}
    />
  );
});

export function Field({
  label,
  hint,
  error,
  htmlFor,
  required,
  children,
  className,
}: {
  label: string;
  hint?: string;
  error?: string;
  htmlFor?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1", className)}>
      <label
        htmlFor={htmlFor}
        className="block text-xs font-semibold uppercase tracking-wide text-ink/70"
      >
        {label}
        {required && <span className="ml-0.5 text-coral-dark">*</span>}
      </label>
      {children}
      {error ? (
        <p role="alert" className="text-xs text-coral-dark">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-ink/55">{hint}</p>
      ) : null}
    </div>
  );
}
