"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Star, GlassWater } from "lucide-react";
import { cn } from "@/lib/utils";

interface Drink {
  id: string;
  name: string;
  description: string | null;
  base_spirit: string | null;
  glass_type: string | null;
  garnish: string | null;
  difficulty: string | null;
  prep_minutes: number | null;
  vibe: string[];
  flavor_profile: string[];
  signature: boolean;
  saved: boolean;
  ai_generated: boolean;
  source_url: string | null;
}

interface Ingredient {
  id: string;
  drink_id: string;
  name: string;
  quantity: number | null;
  unit: string | null;
  category: string | null;
  order_index: number;
}

interface BarProfile {
  style: string[];
  preferred_bases: string[];
  flavor_profile: string[];
  always_keep_at_home: string[];
}

const SPIRIT_BG: Record<string, string> = {
  rom: "from-burgundy/20 to-cream-accent",
  tequila: "from-olive/20 to-cream-accent",
  gin: "from-petrol/20 to-cream-accent",
  bourbon: "from-camel/30 to-cream-accent",
  mezcal: "from-forest/20 to-cream-accent",
};

export function BarView({
  drinks,
  ingredients,
  profile,
}: {
  drinks: Drink[];
  ingredients: Ingredient[];
  profile: BarProfile | null;
}) {
  const [prompt, setPrompt] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const ingByDrink = ingredients.reduce<Record<string, Ingredient[]>>((acc, ing) => {
    (acc[ing.drink_id] ||= []).push(ing);
    return acc;
  }, {});

  function suggest() {
    if (!prompt.trim()) return;
    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/drinks/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: prompt.trim() }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error || "Kunde inte föreslå drink");
        return;
      }
      setPrompt("");
      router.refresh();
    });
  }

  return (
    <div className="grid md:grid-cols-3 gap-10">
      <div className="md:col-span-2">
        <div className="card p-5 mb-8">
          <p className="eyebrow mb-3 flex items-center gap-2">
            <Sparkles size={11} className="text-rust" /> Föreslå en drink
          </p>
          <div className="flex gap-2">
            <input
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && suggest()}
              placeholder='t.ex. "något syrligt med tequila", "en drink för OFYR-kvällen"'
              className="flex-1 bg-transparent border-b border-espresso/30 px-1 py-2 focus:outline-none focus:border-espresso"
            />
            <button onClick={suggest} disabled={!prompt.trim() || isPending} className="btn btn-primary">
              {isPending ? "Mixar..." : "Mixa"}
            </button>
          </div>
          {error && <p className="text-xs text-burgundy mt-2">{error}</p>}
        </div>

        <div className="grid gap-4">
          {drinks.map((d) => (
            <article
              key={d.id}
              className={cn(
                "card overflow-hidden bg-gradient-to-br",
                SPIRIT_BG[d.base_spirit ?? ""] ?? "from-cream-light to-cream-light"
              )}
            >
              <div className="p-5">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {d.signature && <Star size={14} className="text-rust fill-rust" />}
                    <h3 className="text-2xl font-display">{d.name}</h3>
                  </div>
                  <div className="text-xs text-ink-soft uppercase tracking-[0.18em]">
                    {d.base_spirit}
                  </div>
                </div>
                {d.description && <p className="text-sm text-ink-soft mb-4">{d.description}</p>}

                {(ingByDrink[d.id] ?? []).length > 0 && (
                  <ul className="text-sm space-y-1 mb-3">
                    {(ingByDrink[d.id] ?? []).map((ing) => (
                      <li key={ing.id} className="flex justify-between border-b border-espresso/10 pb-1">
                        <span>{ing.name}</span>
                        <span className="text-ink-soft tabular-nums">
                          {ing.quantity ? `${ing.quantity}${ing.unit ? ` ${ing.unit}` : ""}` : ing.unit ?? ""}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}

                <div className="flex items-center gap-3 text-xs text-ink-soft mt-3">
                  {d.glass_type && <span><GlassWater size={11} className="inline mr-1" />{d.glass_type}</span>}
                  {d.garnish && <span>· {d.garnish}</span>}
                  {d.prep_minutes && <span>· {d.prep_minutes} min</span>}
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>

      <aside>
        <div className="divider mb-4">
          <p className="eyebrow">Bar-profil</p>
        </div>
        {profile && (
          <div className="space-y-5 text-sm">
            <div>
              <p className="eyebrow mb-2">Stil</p>
              <div className="flex flex-wrap gap-1.5">
                {profile.style.map((s) => (
                  <span key={s} className="text-xs px-2 py-0.5 bg-cream-accent rounded-sm">{s}</span>
                ))}
              </div>
            </div>
            <div>
              <p className="eyebrow mb-2">Spritbaser</p>
              <div className="flex flex-wrap gap-1.5">
                {profile.preferred_bases.map((s) => (
                  <span key={s} className="text-xs px-2 py-0.5 bg-cream-accent rounded-sm">{s}</span>
                ))}
              </div>
            </div>
            <div>
              <p className="eyebrow mb-2">Smakprofil</p>
              <div className="flex flex-wrap gap-1.5">
                {profile.flavor_profile.map((s) => (
                  <span key={s} className="text-xs px-2 py-0.5 bg-cream-accent rounded-sm">{s}</span>
                ))}
              </div>
            </div>
            <div>
              <p className="eyebrow mb-2">Alltid hemma</p>
              <ul className="text-xs space-y-1">
                {profile.always_keep_at_home.map((s) => (
                  <li key={s}>· {s}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
