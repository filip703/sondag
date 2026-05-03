"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setLoading(false);
    if (error) setError(error.message);
    else setSent(true);
  }

  return (
    <main className="min-h-dvh flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <Link href="/" className="font-display text-2xl block mb-12">Söndag</Link>
        <p className="eyebrow mb-3">Logga in</p>
        <h1 className="text-3xl mb-2">Välkommen tillbaka.</h1>
        <p className="text-sm text-ink-soft mb-8">
          Vi skickar en magisk länk till din mejl. Inga lösenord.
        </p>

        {sent ? (
          <div className="card p-6">
            <p className="text-sm">
              Kolla din inkorg för <strong>{email}</strong>. Klicka på länken för
              att fortsätta.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="email"
              required
              placeholder="filip@hector.se"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-transparent border-b border-espresso/30 px-1 py-3 text-base focus:outline-none focus:border-espresso transition"
            />
            {error && <p className="text-sm text-burgundy">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary w-full justify-center"
            >
              {loading ? "Skickar..." : "Skicka länk"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
