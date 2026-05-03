import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { HOUSEHOLD_ID } from "@/lib/auth-pin";
import { FestView } from "@/components/fest-view";

export const dynamic = "force-dynamic";

export default async function FestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: fest } = await supabase
    .from("sondag_fest_events")
    .select("*")
    .eq("id", id)
    .eq("household_id", HOUSEHOLD_ID)
    .maybeSingle();

  if (!fest) notFound();

  // Hämta alla recept + drink + ingredienser parallellt
  const recipeIds = [fest.starter_recipe_id, fest.main_recipe_id, fest.dessert_recipe_id].filter((x): x is string => !!x);
  const [{ data: recipes }, { data: ingredients }, { data: drink }, { data: drinkIngredients }] = await Promise.all([
    recipeIds.length
      ? supabase.from("sondag_recipes").select("*").in("id", recipeIds)
      : Promise.resolve({ data: [] as Array<{ id: string; title: string; description: string | null; servings: number; prep_minutes: number | null; cook_minutes: number | null; cuisine: string | null; difficulty: string | null; tags: string[]; instructions: string[]; source_url: string | null; ai_generated: boolean }> }),
    recipeIds.length
      ? supabase.from("sondag_recipe_ingredients").select("*").in("recipe_id", recipeIds).order("order_index", { ascending: true })
      : Promise.resolve({ data: [] as Array<{ recipe_id: string; name: string; quantity: number | null; unit: string | null; category: string | null; optional: boolean; order_index: number }> }),
    fest.predrink_drink_id
      ? supabase.from("sondag_drinks").select("*").eq("id", fest.predrink_drink_id).maybeSingle()
      : Promise.resolve({ data: null }),
    fest.predrink_drink_id
      ? supabase.from("sondag_drink_ingredients").select("*").eq("drink_id", fest.predrink_drink_id).order("order_index", { ascending: true })
      : Promise.resolve({ data: [] as Array<{ drink_id: string; name: string; quantity: number | null; unit: string | null; category: string | null; order_index: number }> }),
  ]);

  const recipeMap = new Map((recipes ?? []).map((r) => [r.id, r]));
  const ingByRecipe = (ingredients ?? []).reduce<Record<string, typeof ingredients>>((acc, ing) => {
    (acc[ing.recipe_id] ||= []).push(ing);
    return acc;
  }, {});

  const courses = {
    starter: fest.starter_recipe_id
      ? { ...recipeMap.get(fest.starter_recipe_id), ingredients: ingByRecipe[fest.starter_recipe_id] ?? [] }
      : null,
    main: fest.main_recipe_id
      ? { ...recipeMap.get(fest.main_recipe_id), ingredients: ingByRecipe[fest.main_recipe_id] ?? [] }
      : null,
    dessert: fest.dessert_recipe_id
      ? { ...recipeMap.get(fest.dessert_recipe_id), ingredients: ingByRecipe[fest.dessert_recipe_id] ?? [] }
      : null,
  };

  return (
    <FestView
      fest={fest}
      predrink={drink ? { ...drink, ingredients: drinkIngredients ?? [] } : null}
      courses={courses}
    />
  );
}
