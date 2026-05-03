import { NextResponse } from "next/server";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { generateWeekMenu } from "@/lib/ai/menu";
import { normalizeName } from "@/lib/utils";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { plan_id } = await req.json();
  if (!plan_id) return NextResponse.json({ error: "plan_id krävs" }, { status: 400 });

  const supabase = await createClient();

  // Hämta planen
  const { data: plan, error: planErr } = await supabase
    .from("meal_plans")
    .select("*")
    .eq("id", plan_id)
    .single();
  if (planErr || !plan) return NextResponse.json({ error: "Plan saknas" }, { status: 404 });

  // Befintliga entries (takeaway-markeringar)
  const { data: existingEntries } = await supabase
    .from("meal_plan_entries")
    .select("date, slot, takeaway, takeaway_type")
    .eq("meal_plan_id", plan_id);

  const takeawayDays = (existingEntries ?? [])
    .filter((e) => e.takeaway)
    .map((e) => ({ date: e.date, slot: e.slot, type: e.takeaway_type ?? undefined }));

  // Preferences
  const { data: prefs } = await supabase
    .from("diet_preferences")
    .select("*")
    .eq("household_id", plan.household_id)
    .eq("user_id", user.id)
    .maybeSingle();

  // Pantry
  const { data: pantry } = await supabase
    .from("pantry_items")
    .select("name, quantity, unit")
    .eq("household_id", plan.household_id);

  // Always-have
  const { data: alwaysHave } = await supabase
    .from("always_have_items")
    .select("display_name")
    .eq("household_id", plan.household_id);

  let week;
  try {
    week = await generateWeekMenu({
      weekStart: plan.week_start,
      servings: 4,
      preferences: {
        allergies: prefs?.allergies ?? [],
        dislikes: prefs?.dislikes ?? [],
        diet_type: prefs?.diet_type ?? null,
        notes: prefs?.notes ?? null,
      },
      pantry: pantry ?? [],
      alwaysHave: (alwaysHave ?? []).map((a) => a.display_name),
      takeawayDays,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "AI-fel" },
      { status: 500 }
    );
  }

  // Spara recept + entries
  for (const entry of week.entries) {
    if (entry.takeaway) {
      await supabase.from("meal_plan_entries").upsert(
        {
          meal_plan_id: plan_id,
          date: entry.date,
          slot: entry.slot,
          takeaway: true,
          takeaway_type: entry.takeaway_type,
        },
        { onConflict: "meal_plan_id,date,slot" }
      );
      continue;
    }
    if (!entry.recipe) continue;

    const { data: recipe } = await supabase
      .from("recipes")
      .insert({
        household_id: plan.household_id,
        title: entry.recipe.title,
        description: entry.recipe.description,
        servings: entry.recipe.servings,
        prep_minutes: entry.recipe.prep_minutes,
        cook_minutes: entry.recipe.cook_minutes,
        cuisine: entry.recipe.cuisine,
        difficulty: entry.recipe.difficulty,
        tags: entry.recipe.tags,
        instructions: entry.recipe.instructions,
        ai_generated: true,
        ai_prompt_context: { week_start: plan.week_start },
      })
      .select()
      .single();

    if (!recipe) continue;

    await supabase.from("recipe_ingredients").insert(
      entry.recipe.ingredients.map((ing, idx) => ({
        recipe_id: recipe.id,
        name: ing.name,
        quantity: ing.quantity,
        unit: ing.unit,
        category: ing.category,
        order_index: idx,
      }))
    );

    await supabase.from("meal_plan_entries").upsert(
      {
        meal_plan_id: plan_id,
        date: entry.date,
        slot: entry.slot,
        recipe_id: recipe.id,
        servings: entry.recipe.servings,
      },
      { onConflict: "meal_plan_id,date,slot" }
    );
  }

  // Generera inköpslista från receptens ingredienser
  await rebuildShoppingList(supabase, plan.household_id, plan_id);

  return NextResponse.json({ ok: true, notes: week.notes });
}

async function rebuildShoppingList(
  supabase: Awaited<ReturnType<typeof createClient>>,
  householdId: string,
  planId: string
) {
  // Hämta alla recept-ingredienser för veckans entries
  const { data: entries } = await supabase
    .from("meal_plan_entries")
    .select("recipe_id, recipes(recipe_ingredients(name, quantity, unit, category))")
    .eq("meal_plan_id", planId)
    .not("recipe_id", "is", null);

  // Hämta always-have för filtrering
  const { data: alwaysHave } = await supabase
    .from("always_have_items")
    .select("name_normalized")
    .eq("household_id", householdId);
  const alwaysHaveSet = new Set((alwaysHave ?? []).map((a) => a.name_normalized));

  // Hämta pantry för filtrering
  const { data: pantry } = await supabase
    .from("pantry_items")
    .select("name")
    .eq("household_id", householdId);
  const pantrySet = new Set((pantry ?? []).map((p) => normalizeName(p.name)));

  // Aggregera per (name, unit)
  type Agg = { name: string; quantity: number | null; unit: string | null; category: string | null };
  const agg = new Map<string, Agg>();
  for (const entry of entries ?? []) {
    const ings = (entry.recipes as { recipe_ingredients?: Agg[] } | null)?.recipe_ingredients ?? [];
    for (const ing of ings) {
      const key = `${normalizeName(ing.name)}::${ing.unit ?? ""}`;
      const existing = agg.get(key);
      if (existing) {
        existing.quantity = (existing.quantity ?? 0) + (ing.quantity ?? 0);
      } else {
        agg.set(key, { ...ing });
      }
    }
  }

  // Skapa eller uppdatera aktiv inköpslista
  let { data: list } = await supabase
    .from("shopping_lists")
    .select("id")
    .eq("household_id", householdId)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!list) {
    const { data: newList } = await supabase
      .from("shopping_lists")
      .insert({ household_id: householdId, meal_plan_id: planId, name: "Veckohandling" })
      .select()
      .single();
    list = newList;
  } else {
    // Rensa items för att bygga om
    await supabase.from("shopping_list_items").delete().eq("shopping_list_id", list.id);
  }

  if (!list) return;

  const itemsToInsert = Array.from(agg.values()).map((it, idx) => {
    const norm = normalizeName(it.name);
    return {
      shopping_list_id: list!.id,
      name: it.name,
      quantity: it.quantity,
      unit: it.unit,
      category: it.category,
      have_at_home: alwaysHaveSet.has(norm) || pantrySet.has(norm),
      remember_have_at_home: alwaysHaveSet.has(norm),
      order_index: idx,
    };
  });

  if (itemsToInsert.length) {
    await supabase.from("shopping_list_items").insert(itemsToInsert);
  }
}
