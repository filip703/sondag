"use client";

import { X, Clock, Users, ChefHat, Link2, Sparkles } from "lucide-react";

interface Ingredient {
  recipe_id: string;
  name: string;
  quantity: number | null;
  unit: string | null;
  category: string | null;
  optional: boolean;
  order_index: number;
}

interface Recipe {
  id: string;
  title: string;
  description: string | null;
  servings: number;
  prep_minutes: number | null;
  cook_minutes: number | null;
  cuisine: string | null;
  difficulty: string | null;
  tags: string[];
  instructions: string[];
  source_url: string | null;
  ai_generated: boolean;
  ingredients: Ingredient[];
}

export function RecipeDialog({ recipe, onClose }: { recipe: Recipe; onClose: () => void }) {
  const totalMinutes = (recipe.prep_minutes ?? 0) + (recipe.cook_minutes ?? 0);

  // Gruppera ingredienser per kategori
  const grouped = recipe.ingredients.reduce<Record<string, Ingredient[]>>((acc, ing) => {
    const key = ing.category ?? "övrigt";
    (acc[key] ||= []).push(ing);
    return acc;
  }, {});

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center md:px-4 bg-espresso/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-cream-light w-full md:max-w-2xl md:rounded-sm md:border md:border-espresso/15 max-h-[90dvh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-cream-light border-b border-espresso/15 px-6 py-4 flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              {recipe.cuisine && (
                <span className="eyebrow">{recipe.cuisine}</span>
              )}
              {recipe.ai_generated && (
                <span className="text-[10px] uppercase tracking-[0.18em] text-rust flex items-center gap-1">
                  <Sparkles size={10} /> AI
                </span>
              )}
            </div>
            <h2 className="font-display text-2xl md:text-3xl leading-tight">
              {recipe.title}
            </h2>
            {recipe.description && (
              <p className="text-sm text-ink-soft mt-2 italic">{recipe.description}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-ink-soft hover:text-espresso shrink-0"
          >
            <X size={20} />
          </button>
        </div>

        {/* Meta */}
        <div className="grid grid-cols-3 border-b border-espresso/15">
          <div className="px-4 py-3 text-center border-r border-espresso/15">
            <Users size={14} className="mx-auto text-ink-soft mb-1" />
            <p className="text-xs text-ink-soft">{recipe.servings} portioner</p>
          </div>
          <div className="px-4 py-3 text-center border-r border-espresso/15">
            <Clock size={14} className="mx-auto text-ink-soft mb-1" />
            <p className="text-xs text-ink-soft tabular-nums">
              {totalMinutes ? `${totalMinutes} min` : "—"}
            </p>
            {recipe.prep_minutes && recipe.cook_minutes && (
              <p className="text-[10px] text-ink-soft/70">
                {recipe.prep_minutes} prep · {recipe.cook_minutes} kok
              </p>
            )}
          </div>
          <div className="px-4 py-3 text-center">
            <ChefHat size={14} className="mx-auto text-ink-soft mb-1" />
            <p className="text-xs text-ink-soft capitalize">{recipe.difficulty ?? "—"}</p>
          </div>
        </div>

        {/* Tags */}
        {recipe.tags && recipe.tags.length > 0 && (
          <div className="px-6 py-3 flex flex-wrap gap-1.5 border-b border-espresso/10">
            {recipe.tags.map((t) => (
              <span
                key={t}
                className="text-xs px-2 py-0.5 bg-cream-accent rounded-sm"
              >
                {t}
              </span>
            ))}
          </div>
        )}

        {/* Ingredienser */}
        <section className="px-6 py-5">
          <p className="eyebrow mb-3">Du behöver</p>
          {Object.entries(grouped).map(([cat, list]) => (
            <div key={cat} className="mb-4">
              <p className="text-xs uppercase tracking-[0.18em] text-rust mb-1.5">
                {cat}
              </p>
              <ul>
                {list.map((ing, i) => (
                  <li
                    key={i}
                    className="flex items-baseline justify-between py-1 text-sm border-b border-espresso/10 last:border-0"
                  >
                    <span>
                      {ing.name}
                      {ing.optional && (
                        <span className="text-xs text-ink-soft ml-2">(valfritt)</span>
                      )}
                    </span>
                    <span className="text-ink-soft tabular-nums shrink-0 ml-3">
                      {ing.quantity}
                      {ing.unit && ` ${ing.unit}`}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>

        {/* Steg */}
        {recipe.instructions && recipe.instructions.length > 0 && (
          <section className="px-6 py-5 border-t border-espresso/15">
            <p className="eyebrow mb-3">Så gör du</p>
            <ol className="space-y-3">
              {recipe.instructions.map((step, i) => (
                <li key={i} className="flex gap-4 text-sm">
                  <span className="font-display text-rust text-lg leading-none tabular-nums shrink-0">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="leading-relaxed">{step}</span>
                </li>
              ))}
            </ol>
          </section>
        )}

        {/* Källa */}
        {recipe.source_url && (
          <div className="px-6 py-4 border-t border-espresso/15">
            <a
              href={recipe.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-ink-soft hover:text-rust flex items-center gap-1.5"
            >
              <Link2 size={12} />
              Källa
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
