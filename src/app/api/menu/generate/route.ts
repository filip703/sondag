import { NextResponse } from "next/server";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { generateWeekMenu } from "@/lib/ai/menu";
import { normalizeName } from "@/lib/utils";
import { logActivity } from "@/lib/activity";

export const maxDuration = 60;
export const runtime = "nodejs";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { plan_id } = await req.json();
  if (!plan_id) return NextResponse.json({ error: "plan_id krävs" }, { status: 400 });

  const supabase = await createClient();

  // Hämta planen
  const { data: plan, error: planErr } = await supabase
    .from("sondag_meal_plans")
    .select("*")
    .eq("id", plan_id)
    .single();
  if (planErr || !plan) return NextResponse.json({ error: "Plan saknas" }, { status: 404 });

  // Befintliga entries (takeaway + frånvaro)
  const { data: existingEntries } = await supabase
    .from("sondag_meal_plan_entries")
    .select("date, slot, takeaway, takeaway_type, absent_member_names")
    .eq("meal_plan_id", plan_id);

  const takeawayDays = (existingEntries ?? [])
    .filter((e) => e.takeaway)
    .map((e) => ({ date: e.date, slot: e.slot, type: e.takeaway_type ?? undefined }));

  const absences = (existingEntries ?? [])
    .filter((e) => Array.isArray(e.absent_member_names) && e.absent_member_names.length > 0)
    .map((e) => ({ date: e.date, slot: e.slot, absent: e.absent_member_names as string[] }));

  // Hushållsprofil
  const { data: profile } = await supabase
    .from("sondag_household_profile")
    .select("*")
    .eq("household_id", plan.household_id)
    .maybeSingle();

  // Familjemedlemmar
  const { data: members } = await supabase
    .from("sondag_family_members")
    .select("*")
    .eq("household_id", plan.household_id);

  // Pantry
  const { data: pantry } = await supabase
    .from("sondag_pantry_items")
    .select("name, quantity, unit")
    .eq("household_id", plan.household_id);

  // Always-have
  const { data: alwaysHave } = await supabase
    .from("sondag_always_have_items")
    .select("display_name")
    .eq("household_id", plan.household_id);

  // Mat-historik: senaste 28 dagarna
  const fourWeeksAgo = new Date(plan.week_start);
  fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);
  const fourWeeksAgoIso = fourWeeksAgo.toISOString().slice(0, 10);

  const { data: recentEntries } = await supabase
    .from("sondag_meal_plan_entries")
    .select("date, recipe_id, custom_title")
    .gte("date", fourWeeksAgoIso)
    .lt("date", plan.week_start)
    .not("recipe_id", "is", null)
    .order("date", { ascending: false });

  const recentRecipeIds = (recentEntries ?? []).map((e) => e.recipe_id).filter((x): x is string => !!x);
  const { data: recentRecipes } = recentRecipeIds.length
    ? await supabase
        .from("sondag_recipes")
        .select("id, title, cuisine")
        .in("id", recentRecipeIds)
    : { data: [] as Array<{ id: string; title: string; cuisine: string | null }> };

  const recipeMap = new Map((recentRecipes ?? []).map((r) => [r.id, r]));
  const recentMeals = (recentEntries ?? [])
    .map((e) => {
      const r = e.recipe_id ? recipeMap.get(e.recipe_id) : null;
      return r ? { date: e.date, title: r.title, cuisine: r.cuisine } : null;
    })
    .filter((x): x is { date: string; title: string; cuisine: string | null } => !!x)
    .slice(0, 30);

  let week;
  try {
    week = await generateWeekMenu({
      weekStart: plan.week_start,
      servings: members?.length || 4,
      household: {
        cooking_style: profile?.cooking_style ?? null,
        weekday_minutes_max: profile?.weekday_minutes_max ?? 30,
        takeaway_per_week: profile?.takeaway_per_week ?? 2,
        weekly_recurring: profile?.weekly_recurring ?? {},
        flavor_profile: profile?.flavor_profile ?? [],
        avoid: profile?.avoid ?? [],
        budget_level: profile?.budget_level ?? "medel",
        notes: profile?.notes ?? null,
      },
      members: (members ?? []).map((m) => ({
        name: m.name,
        role: m.role,
        eats_red_meat: m.eats_red_meat,
        eats_fish: m.eats_fish,
        eats_chicken: m.eats_chicken,
        eats_pork: m.eats_pork,
        vegetarian: m.vegetarian,
        vegan: m.vegan,
        allergies: m.allergies ?? [],
        loves: m.loves ?? [],
        dislikes: m.dislikes ?? [],
        always_eats: m.always_eats ?? [],
        food_strategy: m.food_strategy,
        notes: m.notes,
      })),
      pantry: pantry ?? [],
      alwaysHave: (alwaysHave ?? []).map((a) => a.display_name),
      takeawayDays,
      recentMeals,
      absences,
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
      await supabase.from("sondag_meal_plan_entries").upsert(
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
      .from("sondag_recipes")
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

    await supabase.from("sondag_recipe_ingredients").insert(
      entry.recipe.ingredients.map((ing, idx) => ({
        recipe_id: recipe.id,
        name: ing.name,
        quantity: ing.quantity,
        unit: ing.unit,
        category: ing.category,
        order_index: idx,
      }))
    );

    await supabase.from("sondag_meal_plan_entries").upsert(
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

  await logActivity({
    verb: "generated_menu",
    object_type: "meal_plan",
    object_id: plan_id,
    object_name: `vecka ${plan.week_start}`,
    payload: { recipes: week.entries.filter((e) => e.recipe).length },
  });

  return NextResponse.json({ ok: true, notes: week.notes });
}

async function rebuildShoppingList(
  supabase: Awaited<ReturnType<typeof createClient>>,
  householdId: string,
  planId: string
) {
  // Hämta alla entries med recept för veckan, och ingredienser separat
  // (views har ingen FK för PostgREST att JOIN:a på)
  const { data: entries } = await supabase
    .from("sondag_meal_plan_entries")
    .select("recipe_id")
    .eq("meal_plan_id", planId)
    .not("recipe_id", "is", null);

  const recipeIds = (entries ?? []).map((e) => e.recipe_id).filter((x): x is string => !!x);
  const { data: ingredients } = recipeIds.length
    ? await supabase
        .from("sondag_recipe_ingredients")
        .select("recipe_id, name, quantity, unit, category")
        .in("recipe_id", recipeIds)
    : { data: [] as Array<{ recipe_id: string; name: string; quantity: number | null; unit: string | null; category: string | null }> };

  // Hämta always-have för filtrering
  const { data: alwaysHave } = await supabase
    .from("sondag_always_have_items")
    .select("name_normalized")
    .eq("household_id", householdId);
  const alwaysHaveSet = new Set((alwaysHave ?? []).map((a) => a.name_normalized));

  // Hämta pantry för filtrering
  const { data: pantry } = await supabase
    .from("sondag_pantry_items")
    .select("name")
    .eq("household_id", householdId);
  const pantrySet = new Set((pantry ?? []).map((p) => normalizeName(p.name)));

  // Aggregera per (name, unit)
  type Agg = { name: string; quantity: number | null; unit: string | null; category: string | null };
  const agg = new Map<string, Agg>();
  for (const ing of ingredients ?? []) {
    const key = `${normalizeName(ing.name)}::${ing.unit ?? ""}`;
    const existing = agg.get(key);
    if (existing) {
      existing.quantity = (existing.quantity ?? 0) + (ing.quantity ?? 0);
    } else {
      agg.set(key, { name: ing.name, quantity: ing.quantity, unit: ing.unit, category: ing.category });
    }
  }

  // Skapa eller uppdatera aktiv inköpslista
  let { data: list } = await supabase
    .from("sondag_shopping_lists")
    .select("id")
    .eq("household_id", householdId)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!list) {
    const { data: newList } = await supabase
      .from("sondag_shopping_lists")
      .insert({ household_id: householdId, meal_plan_id: planId, name: "Veckohandling" })
      .select()
      .single();
    list = newList;
  } else {
    // Rensa items för att bygga om
    await supabase.from("sondag_shopping_list_items").delete().eq("shopping_list_id", list.id);
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
    await supabase.from("sondag_shopping_list_items").insert(itemsToInsert);
  }
}
