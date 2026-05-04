"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { X, Clock, Users, ChefHat, Link2, Sparkles, Star, Trash2, Ban, RefreshCw, ImageOff } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  rateRecipeAction,
  deleteRecipeFromPlanAction,
  ensureRecipeImageAction,
  regenerateRecipeImageAction,
} from "@/app/actions/recipes";
import { moveEntryAction } from "@/app/actions/meal-plan";
import { weekdayName, startOfWeek, formatDateISO } from "@/lib/utils";
import { ArrowRightLeft } from "lucide-react";

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
  image_url?: string | null;
  rating?: number | null;
  rated_by?: string | null;
  rejected?: boolean;
  ingredients: Ingredient[];
}

export function RecipeDialog({
  recipe,
  onClose,
  planContext,
}: {
  recipe: Recipe;
  onClose: () => void;
  planContext?: { plan_id: string; date: string; slot: string };
}) {
  const [rating, setRating] = useState(recipe.rating ?? 0);
  const [hover, setHover] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();
  const [showDelete, setShowDelete] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(recipe.image_url ?? null);
  const [imageError, setImageError] = useState(false);
  const [showMove, setShowMove] = useState(false);
  const router = useRouter();

  // Lazy-generera bild — körs bara om en provider är aktiverad (annars no-op)
  useEffect(() => {
    if (!imageUrl && recipe.id) {
      ensureRecipeImageAction(recipe.id).then((url) => {
        if (url) setImageUrl(url);
      });
    }
  }, [recipe.id, imageUrl]);

  function regenerate() {
    setImageError(false);
    startTransition(async () => {
      const url = await regenerateRecipeImageAction(recipe.id);
      if (url) {
        // Cache-buster så browsern hämtar nya bilden
        setImageUrl(`${url}${url.includes("?") ? "&" : "?"}_=${Date.now()}`);
      }
    });
  }

  function rate(value: number) {
    setRating(value);
    startTransition(async () => {
      await rateRecipeAction(recipe.id, value);
      router.refresh();
    });
  }

  function deleteFromPlan(reject: boolean) {
    if (!planContext) return;
    startTransition(async () => {
      await deleteRecipeFromPlanAction({
        plan_id: planContext.plan_id,
        date: planContext.date,
        slot: planContext.slot,
        reject_recipe: reject,
        recipe_id: recipe.id,
      });
      onClose();
      router.refresh();
    });
  }

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
        {/* Hero-bild — fixed aspect ratio så modalen inte hoppar när bilden laddas */}
        {imageUrl && !imageError && (
          <div className="relative w-full aspect-[4/3] overflow-hidden bg-gradient-to-br from-cream-accent to-cream-light">
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <Sparkles size={20} className="text-rust/40 animate-pulse" />
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl}
              alt={recipe.title}
              className="relative w-full h-full object-cover"
              onError={() => setImageError(true)}
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-cream-light/90 via-cream-light/0 to-transparent pointer-events-none" />
            <button
              onClick={regenerate}
              disabled={isPending}
              className="absolute top-3 right-3 bg-cream-light/80 backdrop-blur-sm text-espresso hover:bg-cream-light icon-btn rounded-sm"
              title="Generera ny bild"
              style={{ minWidth: 40, minHeight: 40 }}
            >
              <RefreshCw size={16} className={isPending ? "animate-spin" : ""} />
            </button>
          </div>
        )}

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

        {/* Rating + delete */}
        <div className="px-6 py-4 border-b border-espresso/15 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <p className="eyebrow shrink-0">Betyg</p>
            <div
              className="flex items-center gap-0.5"
              onMouseLeave={() => setHover(null)}
            >
              {[1, 2, 3, 4, 5].map((v) => {
                const filled = (hover ?? rating) >= v;
                return (
                  <button
                    key={v}
                    onClick={() => rate(v)}
                    onMouseEnter={() => setHover(v)}
                    disabled={isPending}
                    className="p-1 transition"
                    title={`${v} stjärnor`}
                  >
                    <Star
                      size={20}
                      className={cn(
                        "transition",
                        filled ? "fill-rust text-rust" : "text-ink-soft/30"
                      )}
                    />
                  </button>
                );
              })}
            </div>
            {recipe.rated_by && rating > 0 && (
              <span className="text-xs text-ink-soft">
                — {recipe.rated_by}
              </span>
            )}
            {rating > 0 && rating <= 2 && (
              <span className="text-xs text-burgundy ml-2">
                Plockas inte igen
              </span>
            )}
          </div>

          {planContext && (
            <div className="flex items-center gap-3">
              {!showDelete && (
                <button
                  onClick={() => setShowMove(true)}
                  className="text-xs text-ink-soft hover:text-rust flex items-center gap-1"
                >
                  <ArrowRightLeft size={12} /> Flytta dag
                </button>
              )}
              {!showDelete ? (
                <button
                  onClick={() => setShowDelete(true)}
                  className="text-xs text-ink-soft hover:text-burgundy flex items-center gap-1"
                >
                  <Trash2 size={12} /> Ta bort
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => deleteFromPlan(false)}
                    disabled={isPending}
                    className="btn btn-ghost text-xs"
                    title="Ta bort från veckan men behåll i biblioteket"
                  >
                    <Trash2 size={11} /> Bara här
                  </button>
                  <button
                    onClick={() => deleteFromPlan(true)}
                    disabled={isPending}
                    className="btn btn-primary text-xs"
                    title="Förkasta — AI:n föreslår aldrig denna igen"
                  >
                    <Ban size={11} /> Förkasta
                  </button>
                  <button
                    onClick={() => setShowDelete(false)}
                    className="text-xs text-ink-soft"
                  >
                    Avbryt
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

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
          <section className="px-6 py-6 border-t border-espresso/15">
            <p className="eyebrow mb-4">Så gör du</p>
            <ol className="space-y-5">
              {recipe.instructions.map((step, i) => (
                <li key={i} className="flex gap-5 text-sm">
                  <span className="font-display italic text-rust text-3xl leading-none tabular-nums shrink-0 mt-0.5">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className={cn("leading-relaxed pt-1", i === 0 && "dropcap")}>
                    {step}
                  </span>
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

      {showMove && planContext && (
        <MoveDayDialog
          context={planContext}
          recipeTitle={recipe.title}
          onClose={() => {
            setShowMove(false);
            onClose();
          }}
        />
      )}
    </div>
  );
}

function MoveDayDialog({
  context,
  recipeTitle,
  onClose,
}: {
  context: { plan_id: string; date: string; slot: string };
  recipeTitle: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Generera veckans 7 dagar baserat på från-datum
  const sourceDate = new Date(context.date);
  const weekStart = startOfWeek(sourceDate);
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  function moveTo(targetDate: Date) {
    const targetIso = formatDateISO(targetDate);
    if (targetIso === context.date) {
      onClose();
      return;
    }
    startTransition(async () => {
      await moveEntryAction({
        plan_id: context.plan_id,
        date_from: context.date,
        slot_from: context.slot,
        date_to: targetIso,
        slot_to: context.slot,
      });
      router.refresh();
      onClose();
    });
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center px-4 bg-espresso/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div className="card p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
        <p className="eyebrow mb-1">Flytta dag</p>
        <h2 className="font-display text-xl mb-1 leading-tight">
          <em className="text-rust">{recipeTitle}</em>
        </h2>
        <p className="text-xs text-ink-soft mb-5">
          Välj ny dag. Om dagen redan har en rätt så byter de plats.
        </p>

        <div className="space-y-1.5">
          {days.map((d) => {
            const iso = formatDateISO(d);
            const isCurrent = iso === context.date;
            return (
              <button
                key={iso}
                onClick={() => moveTo(d)}
                disabled={isPending || isCurrent}
                className={cn(
                  "w-full flex items-center justify-between px-4 py-3 border rounded-sm transition text-left",
                  isCurrent
                    ? "border-rust bg-cream-accent cursor-default"
                    : "border-espresso/15 hover:border-espresso hover:bg-cream-accent/50"
                )}
              >
                <div>
                  <p className="font-medium capitalize">{weekdayName(d)}</p>
                  <p className="text-xs text-ink-soft">
                    {d.toLocaleDateString("sv-SE", { day: "numeric", month: "long" })}
                  </p>
                </div>
                {isCurrent ? (
                  <span className="text-xs text-rust uppercase tracking-[0.18em]">Här</span>
                ) : (
                  <ArrowRightLeft size={14} className="text-ink-soft" />
                )}
              </button>
            );
          })}
        </div>

        <div className="flex justify-end mt-5">
          <button onClick={onClose} className="btn btn-ghost">
            Avbryt
          </button>
        </div>
      </div>
    </div>
  );
}
