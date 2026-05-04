import { redirect } from "next/navigation";
import { createClient, getCurrentHousehold } from "@/lib/supabase/server";
import { startOfWeek, formatDateISO, shortDate } from "@/lib/utils";
import { WeekGrid } from "@/components/week-grid";
import { GenerateMenuButton } from "@/components/generate-menu-button";
import { WeekSwitcher } from "@/components/week-switcher";
import { ImportRecipeButton } from "@/components/import-recipe-button";
import { FestButton } from "@/components/fest-dialog";
import { TripBar } from "@/components/trip-bar";
import { Suspense } from "react";

export const dynamic = "force-dynamic";

export default async function VeckaPage({
  searchParams,
}: {
  searchParams: Promise<{ vecka?: string }>;
}) {
  const params = await searchParams;
  const household = await getCurrentHousehold();
  if (!household) redirect("/installningar");

  const weekStart = params.vecka
    ? new Date(params.vecka)
    : startOfWeek(new Date());
  const weekStartIso = formatDateISO(weekStart);
  const isCurrentWeek = formatDateISO(startOfWeek(new Date())) === weekStartIso;
  const prevWeek = new Date(weekStart); prevWeek.setDate(prevWeek.getDate() - 7);
  const nextWeek = new Date(weekStart); nextWeek.setDate(nextWeek.getDate() + 7);

  const supabase = await createClient();

  // Hämta eller skapa veckomeny
  let { data: plan } = await supabase
    .from("sondag_meal_plans")
    .select("*")
    .eq("household_id", household.household_id)
    .eq("week_start", weekStartIso)
    .maybeSingle();

  if (!plan) {
    const { data: newPlan } = await supabase
      .from("sondag_meal_plans")
      .insert({ household_id: household.household_id, week_start: weekStartIso })
      .select()
      .single();
    plan = newPlan;
  }

  // Hämta entries och recept parallellt
  const { data: entries } = await supabase
    .from("sondag_meal_plan_entries")
    .select("*")
    .eq("meal_plan_id", plan!.id);

  const drinkIds = (entries ?? []).map((e) => e.drink_id).filter((x): x is string => !!x);
  const { data: pairedDrinks } = drinkIds.length
    ? await supabase
        .from("sondag_drinks")
        .select("id, name, base_spirit, glass_type")
        .in("id", drinkIds)
    : { data: [] as Array<{ id: string; name: string; base_spirit: string | null; glass_type: string | null }> };
  const drinksById = new Map((pairedDrinks ?? []).map((d) => [d.id, d]));

  // Hämta trippkalendern parallellt
  const recipeIds = (entries ?? []).map((e) => e.recipe_id).filter((x): x is string => !!x);
  const [{ data: recipes }, { data: members }, { data: ingredients }, { data: trips }] = await Promise.all([
    recipeIds.length
      ? supabase
          .from("sondag_recipes")
          .select("id, title, description, image_url, image_prompt, image_seed, prep_minutes, cook_minutes, servings, cuisine, difficulty, tags, instructions, source_url, ai_generated, rating, rated_by, rejected")
          .in("id", recipeIds)
      : Promise.resolve({ data: [] as Array<{ id: string; title: string; description: string | null; image_url: string | null; prep_minutes: number | null; cook_minutes: number | null; servings: number; cuisine: string | null; difficulty: string | null; tags: string[]; instructions: string[]; source_url: string | null; ai_generated: boolean; rating: number | null; rated_by: string | null; rejected: boolean }> }),
    supabase
      .from("sondag_family_members")
      .select("id, name, avatar_color")
      .eq("household_id", household.household_id)
      .order("created_at", { ascending: true }),
    recipeIds.length
      ? supabase
          .from("sondag_recipe_ingredients")
          .select("recipe_id, name, quantity, unit, category, optional, order_index")
          .in("recipe_id", recipeIds)
          .order("order_index", { ascending: true })
      : Promise.resolve({ data: [] as Array<{ recipe_id: string; name: string; quantity: number | null; unit: string | null; category: string | null; optional: boolean; order_index: number }> }),
    supabase
      .from("sondag_trip_periods")
      .select("id, start_date, end_date, title, notes")
      .eq("household_id", household.household_id)
      .gte("end_date", weekStartIso)
      .order("start_date", { ascending: true }),
  ]);

  const ingredientsByRecipe = (ingredients ?? []).reduce<Record<string, typeof ingredients>>(
    (acc, ing) => {
      (acc[ing.recipe_id] ||= []).push(ing);
      return acc;
    },
    {}
  );

  const recipeById = new Map(
    (recipes ?? []).map((r) => [r.id, { ...r, ingredients: ingredientsByRecipe[r.id] ?? [] }])
  );
  const enrichedEntries = (entries ?? []).map((e) => ({
    ...e,
    recipes: e.recipe_id ? recipeById.get(e.recipe_id) ?? null : null,
    drink: e.drink_id ? drinksById.get(e.drink_id) ?? null : null,
  }));

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  // Vecka-nummer enligt ISO 8601
  const weekNumber = getISOWeek(weekStart);

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-12">
        <div className="flex-1">
          <div className="flex items-baseline gap-3 mb-2">
            <span className="section-no text-5xl md:text-6xl tabular-nums leading-none">
              v.{weekNumber}
            </span>
            {isCurrentWeek && (
              <span className="inline-block px-2 py-0.5 bg-rust text-cream text-[10px] uppercase tracking-[0.18em] rounded-sm">
                Just nu
              </span>
            )}
          </div>
          <h1 className="text-3xl md:text-4xl mt-4">
            {shortDate(weekStart)} <em className="text-rust">—</em>{" "}
            {shortDate(days[6])}
          </h1>
          <p className="text-sm text-ink-soft mt-3 italic max-w-md">
            Söndag är planeringsdagen. Tap en cell för att lägga till med AI eller markera takeaway.
          </p>
        </div>
        <div className="flex items-end gap-3">
          <WeekSwitcher
            currentIso={weekStartIso}
            prevIso={formatDateISO(prevWeek)}
            nextIso={formatDateISO(nextWeek)}
            isCurrentWeek={isCurrentWeek}
          />
          <Suspense>
            <GenerateMenuButton planId={plan!.id} />
          </Suspense>
        </div>
      </div>

      <div className="mb-6 flex items-center gap-2 flex-wrap">
        <ImportRecipeButton />
        <FestButton />
        <TripBar trips={trips ?? []} />
      </div>

      <WeekGrid days={days} entries={enrichedEntries} planId={plan!.id} members={members ?? []} />
    </div>
  );
}

function getISOWeek(d: Date): number {
  const date = new Date(d);
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + 3 - ((date.getDay() + 6) % 7));
  const week1 = new Date(date.getFullYear(), 0, 4);
  return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
}
