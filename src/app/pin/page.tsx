"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function PinPage() {
  const [digits, setDigits] = useState(["", "", "", ""]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const refs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];
  const router = useRouter();

  useEffect(() => {
    refs[0].current?.focus();
  }, []);

  function setDigit(i: number, v: string) {
    if (!/^\d?$/.test(v)) return;
    const next = [...digits];
    next[i] = v;
    setDigits(next);
    if (v && i < 3) refs[i + 1].current?.focus();
    if (next.every((d) => d) && next.join("").length === 4) {
      submit(next.join(""));
    }
  }

  function onKeyDown(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[i] && i > 0) {
      refs[i - 1].current?.focus();
    }
  }

  async function submit(pin: string) {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/pin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin }),
    });
    setLoading(false);
    if (!res.ok) {
      setError("Fel kod. Försök igen.");
      setDigits(["", "", "", ""]);
      refs[0].current?.focus();
      return;
    }
    router.push("/vecka");
    router.refresh();
  }

  return (
    <main className="min-h-dvh flex items-center justify-center px-6">
      <div className="w-full max-w-sm text-center">
        <Link href="/" className="font-display text-2xl block mb-12">
          Söndag
        </Link>
        <p className="eyebrow mb-3">Skriv in din kod</p>
        <h1 className="text-3xl mb-8">
          Välkommen <em className="text-rust">hem</em>.
        </h1>

        <div className="flex justify-center gap-3 mb-6">
          {digits.map((d, i) => (
            <input
              key={i}
              ref={refs[i]}
              type="tel"
              inputMode="numeric"
              maxLength={1}
              value={d}
              onChange={(e) => setDigit(i, e.target.value)}
              onKeyDown={(e) => onKeyDown(i, e)}
              className="w-14 h-16 text-center text-2xl font-display bg-cream-light border border-espresso/30 rounded-sm focus:outline-none focus:border-espresso transition"
            />
          ))}
        </div>

        {loading && <p className="text-sm text-ink-soft">Kollar...</p>}
        {error && <p className="text-sm text-burgundy">{error}</p>}

        <p className="mt-12 text-xs text-ink-soft">
          Hint: koden står i <code>.env.local</code> som <code>SONDAG_PIN</code>.
        </p>
      </div>
    </main>
  );
}
