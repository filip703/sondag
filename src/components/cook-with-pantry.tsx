"use client";

import { useState, useTransition } from "react";
import { Sparkles, X, Clock } from "lucide-react";

interface Suggestion {
  title: string;
  description: string;
  uses_pantry: string[];
  extra_needed: string[];
  prep_minutes: number;
  cook_minutes: number;
  instructions_short: string[];
}

export function CookWithPantryButton() {
  const [open, setOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function generate() {
    setError(null);
    setSuggestions(null);
    setOpen(true);
    startTransition(async () => {
      const res = await fetch("/api/menu/cook-with-pantry", { method: "POST" });
      const j = await res.json();
      if (!res.ok) {
        setError(j.error ?? "Kunde inte föreslå");
        return;
      }
      setSuggestions(j.suggestions ?? []);
    });
  }

  return (
    <>
      <button onClick={generate} className="btn btn-primary text-xs">
        <Sparkles size={12} />
        Vad kan jag laga?
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end md:items-center justify-center md:px-4 bg-espresso/40 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-cream-light w-full md:max-w-2xl md:rounded-sm md:border md:border-espresso/15 max-h-[90dvh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-cream-light border-b border-espresso/15 px-6 py-4 flex items-start justify-between">
              <div>
                <p className="eyebrow flex items-center gap-2">
                  <Sparkles size={11} className="text-rust" /> Av det som finns hemma
                </p>
                <h2 className="font-display text-2xl mt-1">Vad ska vi <em className="text-rust">laga</em>?</h2>
              </div>
              <button onClick={() => setOpen(false)} className="text-ink-soft hover:text-espresso">
                <X size={18} />
              </button>
            </div>

            {isPending && (
              <div className="p-12 text-center text-sm text-ink-soft italic">
                Bläddrar genom skafferiet...
              </div>
            )}

            {error && <p className="p-6 text-sm text-burgundy">{error}</p>}

            {suggestions && (
              <div className="p-6 space-y-6">
                {suggestions.map((s, i) => (
                  <article key={i} className="card p-5">
                    <h3 className="font-display text-xl">{s.title}</h3>
                    <p className="text-sm text-ink-soft italic mt-1">{s.description}</p>
                    <div className="flex items-center gap-3 mt-3 text-xs text-ink-soft">
                      <span className="flex items-center gap-1">
                        <Clock size={11} /> {(s.prep_minutes ?? 0) + (s.cook_minutes ?? 0)} min
                      </span>
                    </div>

                    <div className="mt-4">
                      <p className="eyebrow mb-1.5">Använder från skafferiet</p>
                      <p className="text-sm">{s.uses_pantry.join(", ")}</p>
                    </div>

                    {s.extra_needed.length > 0 && (
                      <div className="mt-3 p-3 bg-cream-accent rounded-sm">
                        <p className="eyebrow text-rust mb-1">Du behöver också</p>
                        <p className="text-sm">{s.extra_needed.join(", ")}</p>
                      </div>
                    )}

                    {s.instructions_short.length > 0 && (
                      <div className="mt-4">
                        <p className="eyebrow mb-1.5">Så gör du</p>
                        <ol className="text-sm space-y-1">
                          {s.instructions_short.map((step, j) => (
                            <li key={j} className="flex gap-2">
                              <span className="text-rust tabular-nums shrink-0">{j + 1}</span>
                              <span>{step}</span>
                            </li>
                          ))}
                        </ol>
                      </div>
                    )}
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
