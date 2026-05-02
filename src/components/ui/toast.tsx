"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { cn } from "@/lib/cn";

type ToastTone = "success" | "error" | "info";

interface Toast {
  id: number;
  tone: ToastTone;
  message: string;
}

interface ToastApi {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counter = useRef(0);

  const remove = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (tone: ToastTone, message: string) => {
      counter.current += 1;
      const id = counter.current;
      setToasts((prev) => [...prev, { id, tone, message }]);
      // Auto-dismiss after 4s.
      setTimeout(() => remove(id), 4000);
    },
    [remove],
  );

  const api = useMemo<ToastApi>(
    () => ({
      success: (m: string) => push("success", m),
      error: (m: string) => push("error", m),
      info: (m: string) => push("info", m),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-full max-w-sm flex-col gap-2"
      >
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onClose={() => remove(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  const [closing, setClosing] = useState(false);
  useEffect(() => {
    const id = window.setTimeout(() => setClosing(true), 3700);
    return () => window.clearTimeout(id);
  }, []);
  return (
    <div
      className={cn(
        "pointer-events-auto flex items-start gap-3 rounded-xl px-4 py-3 shadow-lg ring-1 transition",
        toast.tone === "success" &&
          "bg-emerald-50 text-emerald-900 ring-emerald-200",
        toast.tone === "error" &&
          "bg-coral-dark/10 text-coral-dark ring-coral-dark/30",
        toast.tone === "info" && "bg-cream text-ink ring-coral/20",
        closing && "opacity-0",
      )}
    >
      <p className="flex-1 text-sm font-medium">{toast.message}</p>
      <button
        type="button"
        onClick={onClose}
        aria-label="Dismiss"
        className="text-xs font-bold text-current/60 hover:text-current"
      >
        ×
      </button>
    </div>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used inside <ToastProvider>");
  }
  return ctx;
}
