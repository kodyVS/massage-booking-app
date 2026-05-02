"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { loginAction } from "./actions";

interface LoginFormProps {
  from?: string;
  initialError?: string;
}

export function LoginForm({ from, initialError }: LoginFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | undefined>(initialError);
  const [pending, startTransition] = useTransition();

  function onSubmit(formData: FormData) {
    setError(undefined);
    startTransition(async () => {
      const result = await loginAction(formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push(result.redirectTo);
      router.refresh();
    });
  }

  return (
    <form
      action={onSubmit}
      className="mt-8 flex flex-col gap-4 rounded-2xl bg-blush/40 p-6"
    >
      {from ? <input type="hidden" name="from" value={from} /> : null}
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-ink">Email</span>
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          className="rounded-md border border-ink/20 bg-cream px-3 py-2"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-ink">Password</span>
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="rounded-md border border-ink/20 bg-cream px-3 py-2"
        />
      </label>
      {error ? (
        <p
          role="alert"
          className="text-sm text-coral-dark"
        >
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-coral px-4 py-2 font-medium text-cream transition hover:bg-coral-dark disabled:opacity-60"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
