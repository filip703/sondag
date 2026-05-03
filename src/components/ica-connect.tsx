"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Lock, Store } from "lucide-react";

interface IcaConn {
  ica_username: string | null;
  default_store_id: string | null;
  default_store_name: string | null;
  last_synced_at: string | null;
}

export function IcaConnect({
  householdId,
  initial,
}: {
  householdId: string;
  initial: IcaConn | null;
}) {
  const [username, setUsername] = useState(initial?.ica_username ?? "");
  const [password, setPassword] = useState("");
  const [storeId, setStoreId] = useState(initial?.default_store_id ?? "");
  const [storeName, setStoreName] = useState(initial?.default_store_name ?? "Maxi ICA Stormarknad Häggvik");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  async function connect() {
    setError(null);
    setSuccess(false);
    startTransition(async () => {
      const res = await fetch("/api/ica/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          household_id: householdId,
          username,
          password,
          default_store_id: storeId || null,
          default_store_name: storeName || null,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error || "Kunde inte ansluta till ICA");
        return;
      }
      setPassword("");
      setSuccess(true);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-ink-soft">
        Logga in med ditt Mitt ICA-konto. Inloggningen sker via ICA:s officiella autentiserings-endpoint
        och token sparas krypterat.
      </p>

      <div>
        <label className="eyebrow block mb-2">Mitt ICA — användarnamn</label>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="filip@hector.se eller personnummer"
          autoComplete="username"
          className="w-full bg-transparent border-b border-espresso/30 px-1 py-2 focus:outline-none focus:border-espresso"
        />
      </div>
      <div>
        <label className="eyebrow block mb-2 flex items-center gap-2">
          <Lock size={11} /> Lösenord
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          className="w-full bg-transparent border-b border-espresso/30 px-1 py-2 focus:outline-none focus:border-espresso"
        />
        {initial?.ica_username && !password && (
          <p className="text-xs text-ink-soft mt-1">
            Lämna tomt för att behålla befintlig session.
          </p>
        )}
      </div>
      <div>
        <label className="eyebrow block mb-2 flex items-center gap-2">
          <Store size={11} /> Standardbutik
        </label>
        <input
          type="text"
          value={storeName}
          onChange={(e) => setStoreName(e.target.value)}
          placeholder="Maxi ICA Stormarknad Häggvik"
          className="w-full bg-transparent border-b border-espresso/30 px-1 py-2 focus:outline-none focus:border-espresso"
        />
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={connect}
          disabled={isPending || !username || (!password && !initial?.ica_username)}
          className="btn btn-primary"
        >
          {isPending ? "Ansluter..." : initial?.ica_username ? "Uppdatera" : "Anslut"}
        </button>
        {success && <span className="text-sm text-ink-soft">Anslutet.</span>}
        {error && <span className="text-sm text-burgundy">{error}</span>}
      </div>

      {initial?.last_synced_at && (
        <p className="text-xs text-ink-soft pt-4 border-t border-espresso/15">
          Senast synkad{" "}
          {new Date(initial.last_synced_at).toLocaleString("sv-SE")}
        </p>
      )}

      <details className="text-xs text-ink-soft">
        <summary className="cursor-pointer hover:text-espresso">
          Tekniskt om ICA-integrationen
        </summary>
        <div className="mt-3 space-y-2 leading-relaxed">
          <p>
            Söndag använder ICA:s privata Handla-API (<code>handla.api.ica.se</code>).
            Det är inte officiellt publikt, men används av ICA:s egna appar och har
            varit stabilt i flera år.
          </p>
          <p>
            Inloggningen går via ICA:s OIDC-endpoint. Tokens sparas i Supabase Vault.
            Om ICA någonsin ändrar sitt API faller appen tillbaka på en delad-list-export
            via ICA Handla.
          </p>
        </div>
      </details>
    </div>
  );
}
