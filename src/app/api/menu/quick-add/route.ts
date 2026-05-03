import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/activity";
import { HOUSEHOLD_ID } from "@/lib/auth-pin";
import Anthropic from "@anthropic-ai/sdk";

interface Body {
  plan_id: string;
  date: string;
  slot: string;
  prompt: string;
  servings?: number;
}

const SYSTEM = `Du är en svensk hushållskock. Användaren skriver en kort fritext-beskrivning av vad de vill äta. Du tar fram ett konkret recept.

Returnera ENDAST JSON i kodblock:
\`\`\`json
{
  "title": "Kort, beskrivande titel på svenska",
  "description": "1 mening om rätten",
  "servings": 4,
  "prep_minutes": 15,
  "cook_minutes": 25,
  "cuisine": "svensk",
  "difficulty": "lätt",
  "tags": ["snabbt", "comfort"],
  "instructions": ["Steg 1", "Steg 2"],
  "ingredients": [
    {"name": "Kycklingfilé", "quantity": 600, "unit": "g", "category": "kött"}
  ],
  "todd_safe_components": ["pasta separat", "kyckling utan sås"]
}
\`\`\`

Regler:
- Svenska ingrediensnamn, metriska enheter (g, dl, ml, st)
- Kategorier: kött, fisk, mejeri, frukt-grönt, skafferi, frys, bröd, snacks, dryck
- 4 portioner om inget annat
- Korta ord ("gryta", "pasta") → välj en hederlig variant för svensk familjevardag`;

export async function POST(req: Request) {
  const body = (await req.json()) as Body;
  if (!body.prompt?.trim() || !body.plan_id || !body.date || !body.slot) {
    return NextResponse.json({ error: "prompt/plan_id/date/slot krävs" }, { status: 400 });
  }

  const supabase = await createClient();
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4000,
    system: SYSTEM,
    messages: [{ role: "user", content: `Föreslå rätt: "${body.prompt}". Servings: ${body.servings ?? 4}.` }],
  });

  const text = message.content.filter((b) => b.type === "text").map((b) => (b as { text: string }).text).join("\n");
  const match = text.match(/```json\s*([\s\S]+?)\s*```/) || text.match(/(\{[\s\S]+\})/);
  if (!match) return NextResponse.json({ error: "AI gav inget JSON-svar" }, { status: 502 });

  let recipe;
  try { recipe = JSON.parse(match[1]); } catch { return NextResponse.json({ error: "Kunde inte parsa AI-svaret" }, { status: 502 }); }

  const { data: saved } = await supabase
    .from("sondag_recipes")
    .insert({
      household_id: HOUSEHOLD_ID,
      title: recipe.title,
      description: recipe.description,
      servings: recipe.servings ?? body.servings ?? 4,
      prep_minutes: recipe.prep_minutes,
      cook_minutes: recipe.cook_minutes,
      cuisine: recipe.cuisine,
      difficulty: recipe.difficulty,
      tags: recipe.tags ?? [],
      instructions: recipe.instructions ?? [],
      ai_generated: true,
      ai_prompt_context: { quick_add_prompt: body.prompt },
    })
    .select()
    .single();

  if (!saved) return NextResponse.json({ error: "Kunde inte spara recept" }, { status: 500 });

  if (Array.isArray(recipe.ingredients) && recipe.ingredients.length) {
    await supabase.from("sondag_recipe_ingredients").insert(
      recipe.ingredients.map((ing: { name: string; quantity: number | null; unit: string | null; category: string | null }, idx: number) => ({
        recipe_id: saved.id, name: ing.name, quantity: ing.quantity, unit: ing.unit, category: ing.category, order_index: idx,
      }))
    );
  }

  await supabase.from("sondag_meal_plan_entries").upsert(
    { meal_plan_id: body.plan_id, date: body.date, slot: body.slot, recipe_id: saved.id, servings: recipe.servings ?? 4 },
    { onConflict: "meal_plan_id,date,slot" }
  );

  // Lägg ingredienserna på aktiv inköpslista
  const { data: list } = await supabase
    .from("sondag_shopping_lists")
    .select("id")
    .eq("household_id", HOUSEHOLD_ID)
    .in("status", ["active", "synced_to_ica"])
    .order("created_at", { ascending: false }).limit(1).maybeSingle();

  if (list && Array.isArray(recipe.ingredients)) {
    const { data: alwaysHave } = await supabase
      .from("sondag_always_have_items").select("name_normalized").eq("household_id", HOUSEHOLD_ID);
    const alwaysHaveSet = new Set((alwaysHave ?? []).map((a) => a.name_normalized));

    await supabase.from("sondag_shopping_list_items").insert(
      recipe.ingredients.map((ing: { name: string; quantity: number | null; unit: string | null; category: string | null }, idx: number) => {
        const norm = ing.name.toLowerCase().replace(/[åä]/g, "a").replace(/ö/g, "o").trim();
        return {
          shopping_list_id: list.id, name: ing.name, quantity: ing.quantity, unit: ing.unit, category: ing.category,
          have_at_home: alwaysHaveSet.has(norm), remember_have_at_home: alwaysHaveSet.has(norm),
          recipe_id: saved.id, order_index: 1000 + idx,
        };
      })
    );
  }

  await logActivity({
    verb: "added_pantry",
    object_type: "meal_entry",
    object_id: saved.id,
    object_name: `${body.prompt} → ${recipe.title}`,
    payload: { date: body.date, slot: body.slot, ai_prompt: body.prompt },
  });

  return NextResponse.json({ ok: true, recipe: { id: saved.id, title: recipe.title } });
}
