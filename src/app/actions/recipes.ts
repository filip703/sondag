"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { logActivity } from "@/lib/activity";
import { getActiveActor } from "@/lib/auth-pin";
import { recipeImage } from "@/lib/ai/images";

export async function rateRecipeAction(recipeId: string, rating: number) {
  if (rating < 1 || rating > 5) throw new Error("Betyg måste vara 1-5");
  const supabase = await createClient();
  const actor = await getActiveActor();

  const { data: recipe } = await supabase
    .from("sondag_recipes")
    .select("title")
    .eq("id", recipeId)
    .maybeSingle();

  await supabase
    .from("sondag_recipes")
    .update({
      rating,
      rated_by: actor?.name ?? null,
      rated_at: new Date().toISOString(),
      // Auto-reject vid 1-2 stjärnor → AI väljer aldrig dem igen
      rejected: rating <= 2,
    })
    .eq("id", recipeId);

  await logActivity({
    verb: "edited_member",
    object_type: "recipe_rating",
    object_id: recipeId,
    object_name: `${recipe?.title ?? "recept"} — ${rating}★`,
    payload: { rating, recipe_id: recipeId },
  });

  revalidatePath("/vecka");
  revalidatePath("/aktivitet");
}

/**
 * Säkerställ att ett recept har en bild. Genereras lazy om saknas.
 * Returnerar image_url. Idempotent — om bild finns sedan tidigare gör inget.
 */
export async function ensureRecipeImageAction(recipeId: string): Promise<string | null> {
  const supabase = await createClient();

  const { data: r } = await supabase
    .from("sondag_recipes")
    .select("id, title, description, cuisine, tags, image_url")
    .eq("id", recipeId)
    .maybeSingle();

  if (!r) return null;
  if (r.image_url) return r.image_url;

  const img = recipeImage({
    title: r.title,
    description: r.description,
    cuisine: r.cuisine,
    tags: r.tags ?? [],
  });

  await supabase
    .from("sondag_recipes")
    .update({
      image_url: img.url,
      image_prompt: img.prompt,
      image_seed: img.seed,
    })
    .eq("id", recipeId);

  return img.url;
}

/**
 * Regenerera bild med ny seed (om Filip inte gillar nuvarande).
 */
export async function regenerateRecipeImageAction(recipeId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data: r } = await supabase
    .from("sondag_recipes")
    .select("id, title, description, cuisine, tags")
    .eq("id", recipeId)
    .maybeSingle();
  if (!r) return null;

  const img = recipeImage(
    { title: r.title, description: r.description, cuisine: r.cuisine, tags: r.tags ?? [] },
    { seed: Math.floor(Math.random() * 1_000_000) }
  );
  await supabase
    .from("sondag_recipes")
    .update({ image_url: img.url, image_prompt: img.prompt, image_seed: img.seed })
    .eq("id", recipeId);

  await logActivity({
    verb: "edited_member",
    object_type: "recipe_image",
    object_id: recipeId,
    object_name: `Ny bild på "${r.title}"`,
  });

  revalidatePath("/vecka");
  return img.url;
}

export async function deleteRecipeFromPlanAction(args: {
  plan_id: string;
  date: string;
  slot: string;
  reject_recipe?: boolean;
  recipe_id?: string | null;
}) {
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("sondag_meal_plan_entries")
    .select("recipe_id, sondag_recipes:recipe_id(title)")
    .match({ meal_plan_id: args.plan_id, date: args.date, slot: args.slot })
    .maybeSingle();

  await supabase
    .from("sondag_meal_plan_entries")
    .delete()
    .match({ meal_plan_id: args.plan_id, date: args.date, slot: args.slot });

  // Om reject → markera receptet så AI:n aldrig planerar in det igen
  if (args.reject_recipe && args.recipe_id) {
    await supabase
      .from("sondag_recipes")
      .update({ rejected: true, rating: 1 })
      .eq("id", args.recipe_id);
  }

  const recipeName = (existing?.sondag_recipes as { title?: string } | null)?.title ?? "rätt";
  await logActivity({
    verb: "removed_pantry",
    object_type: "meal_entry",
    object_name: args.reject_recipe
      ? `${recipeName} — borttagen + förkastad`
      : `${recipeName} — borttagen från ${args.date}`,
    payload: { date: args.date, slot: args.slot, rejected: !!args.reject_recipe },
  });

  revalidatePath("/vecka");
}
