"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, RefreshCw, Wine, Salad, ChefHat, Cake, Users } from "lucide-react";
import { cn } from "@/lib/utils";

interface Ingredient {
  name: string;
  quantity: number | null;
  unit: string | null;
  category: string | null;
}

interface Recipe {
  id?: string;
  title?: string;
  description?: string | null;
  servings?: number;
  prep_minutes?: number | null;
  cook_minutes?: number | null;
  cuisine?: string | null;
  difficulty?: string | null;
  tags?: string[];
  instructions?: string[];
  ingredients: Ingredient[];
}

interface Drink {
  id: string;
  name: string;
  description: string | null;
  base_spirit: string | null;
  glass_type: string | null;
  garnish: string | null;
  prep_minutes: number | null;
  instructions: string[];
  ingredients: Array<{ name: string; quantity: number | null; unit: string | null; category: string | null }>;
}

interface Fest {
  id: string;
  date: string;
  title: string;
  guest_count: number;
  vibe: string | null;
  notes: string | null;
}

const COURSE_META = {
  predrink: { icon: Wine, label: "Pre-drink", color: "text-petrol" },
  starter: { icon: Salad, label: "Förrätt", color: "text-olive" },
  main: { icon: ChefHat, label: "Huvudrätt", color: "text-rust" },
  dessert: { icon: Cake, label: "Dessert", color: "text-camel" },
};

export function FestView({
  fest,
  predrink,
  courses,
}: {
  fest: Fest;
  predrink: Drink | null;
  courses: { starter: Recipe | null; main: Recipe | null; dessert: Recipe | null };
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function regenerate(course: "predrink" | "starter" | "main" | "dessert") {
    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/menu/fest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fest_id: fest.id,
          date: fest.date,
          guest_count: fest.guest_count,
          vibe: fest.vibe,
          notes: fest.notes,
          regenerate_course: course,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error ?? "Kunde inte regenerera");
        return;
      }
      router.refresh();
    });
  }

  return (
    <div>
      <div className="mb-10">
        <p className="eyebrow mb-3">
          Fest · {new Date(fest.date).toLocaleDateString("sv-SE", { weekday: "long", day: "numeric", month: "long" })}
        </p>
        <h1 className="text-4xl md:text-5xl">
          {fest.title} <em className="text-rust">för {fest.guest_count}</em>.
        </h1>
        {fest.vibe && (
          <p className="text-sm text-ink-soft mt-3 italic">{fest.vibe}</p>
        )}
        <div className="flex items-center gap-4 mt-3 text-xs text-ink-soft">
          <span className="flex items-center gap-1">
            <Users size={11} /> {fest.guest_count} gäster
          </span>
          {fest.notes && <span>· {fest.notes}</span>}
        </div>
      </div>

      {error && <p className="text-sm text-burgundy mb-4">{error}</p>}

      <div className="space-y-10">
        <Course
          type="predrink"
          name={predrink?.name}
          description={predrink?.description}
          minutes={predrink?.prep_minutes}
          difficulty={null}
          ingredients={predrink?.ingredients ?? []}
          instructions={predrink?.instructions ?? []}
          extra={predrink ? `${predrink.glass_type ?? ""}${predrink.garnish ? ` · ${predrink.garnish}` : ""}` : null}
          onRegenerate={() => regenerate("predrink")}
          isPending={isPending}
        />
        <Course
          type="starter"
          name={courses.starter?.title}
          description={courses.starter?.description}
          minutes={(courses.starter?.prep_minutes ?? 0) + (courses.starter?.cook_minutes ?? 0)}
          difficulty={courses.starter?.difficulty}
          ingredients={courses.starter?.ingredients ?? []}
          instructions={courses.starter?.instructions ?? []}
          extra={null}
          onRegenerate={() => regenerate("starter")}
          isPending={isPending}
        />
        <Course
          type="main"
          name={courses.main?.title}
          description={courses.main?.description}
          minutes={(courses.main?.prep_minutes ?? 0) + (courses.main?.cook_minutes ?? 0)}
          difficulty={courses.main?.difficulty}
          ingredients={courses.main?.ingredients ?? []}
          instructions={courses.main?.instructions ?? []}
          extra={null}
          onRegenerate={() => regenerate("main")}
          isPending={isPending}
        />
        <Course
          type="dessert"
          name={courses.dessert?.title}
          description={courses.dessert?.description}
          minutes={(courses.dessert?.prep_minutes ?? 0) + (courses.dessert?.cook_minutes ?? 0)}
          difficulty={courses.dessert?.difficulty}
          ingredients={courses.dessert?.ingredients ?? []}
          instructions={courses.dessert?.instructions ?? []}
          extra={null}
          onRegenerate={() => regenerate("dessert")}
          isPending={isPending}
        />
      </div>
    </div>
  );
}

function Course({
  type,
  name,
  description,
  minutes,
  difficulty,
  ingredients,
  instructions,
  extra,
  onRegenerate,
  isPending,
}: {
  type: keyof typeof COURSE_META;
  name?: string | null;
  description?: string | null;
  minutes: number | null | undefined;
  difficulty: string | null | undefined;
  ingredients: Ingredient[];
  instructions: string[];
  extra: string | null;
  onRegenerate: () => void;
  isPending: boolean;
}) {
  const meta = COURSE_META[type];
  const Icon = meta.icon;

  return (
    <article className="card p-6 md:p-8">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div>
          <p className={cn("eyebrow flex items-center gap-2", meta.color)}>
            <Icon size={12} />
            {meta.label}
          </p>
          <h2 className="font-display text-2xl md:text-3xl mt-1.5">
            {name ?? <span className="text-ink-soft italic">Inget genererat än</span>}
          </h2>
          {description && <p className="text-sm text-ink-soft mt-2 italic">{description}</p>}
          {extra && <p className="text-xs text-ink-soft mt-1">{extra}</p>}
          <div className="flex items-center gap-3 mt-2 text-xs text-ink-soft">
            {minutes ? <span>{minutes} min</span> : null}
            {difficulty && <span className="capitalize">· {difficulty}</span>}
          </div>
        </div>
        <button
          onClick={onRegenerate}
          disabled={isPending}
          className="btn btn-ghost text-xs shrink-0"
          title="Regenerera denna kurs"
        >
          <RefreshCw size={11} className={isPending ? "animate-spin" : ""} />
          Regenerera
        </button>
      </div>

      {ingredients.length > 0 && (
        <div className="mt-5 grid md:grid-cols-2 gap-x-8 gap-y-1">
          <div>
            <p className="eyebrow mb-2">Ingredienser</p>
            <ul className="text-sm">
              {ingredients.map((ing, i) => (
                <li key={i} className="flex justify-between py-1 border-b border-espresso/10">
                  <span>{ing.name}</span>
                  <span className="text-ink-soft tabular-nums">
                    {ing.quantity}
                    {ing.unit && ` ${ing.unit}`}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          {instructions.length > 0 && (
            <div>
              <p className="eyebrow mb-2">Steg</p>
              <ol className="text-sm space-y-2">
                {instructions.map((s, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="font-display text-rust tabular-nums shrink-0">{i + 1}</span>
                    <span className="leading-relaxed">{s}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}
    </article>
  );
}
