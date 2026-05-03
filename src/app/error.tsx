"use client";

import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="min-h-dvh flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        <p className="eyebrow mb-3">Ett fel uppstod</p>
        <h1 className="text-3xl mb-4">
          Något <em className="text-rust">spårade ur</em>.
        </h1>
        <p className="text-sm text-ink-soft mb-8 font-mono">{error.message}</p>
        <div className="flex items-center justify-center gap-3">
          <button onClick={reset} className="btn btn-primary">
            Försök igen
          </button>
          <Link href="/vecka" className="btn btn-ghost">
            Till startsidan
          </Link>
        </div>
      </div>
    </main>
  );
}
