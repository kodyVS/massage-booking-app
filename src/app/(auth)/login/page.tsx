import { LoginForm } from "./login-form";

interface LoginPageProps {
  searchParams: Promise<{ from?: string; error?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { from, error } = await searchParams;
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-24">
      <div className="w-full max-w-sm">
        <h1 className="font-display text-3xl text-coral-dark">Sign in</h1>
        <p className="mt-2 text-sm text-ink/70">
          Staff portal for Vital Touch Massage.
        </p>
        <LoginForm from={from} initialError={error} />
      </div>
    </main>
  );
}
