import { cn } from "@/lib/cn";

export function EmptyState({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border-2 border-dashed border-coral/20 bg-cream/60 p-8 text-center",
        className,
      )}
    >
      <p className="font-display text-lg text-coral-dark">{title}</p>
      {description && <p className="mt-1 text-sm text-ink/70">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorBox({
  message,
  className,
}: {
  message: string;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={cn(
        "rounded-xl border border-coral-dark/40 bg-coral-dark/10 p-4 text-sm text-coral-dark",
        className,
      )}
    >
      {message}
    </div>
  );
}
