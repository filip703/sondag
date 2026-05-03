import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { HOUSEHOLD_ID } from "@/lib/auth-pin";
import { logActivity } from "@/lib/activity";
import Anthropic from "@anthropic-ai/sdk";
import { recipeImage } from "@/lib/ai/images";

export const maxDuration = 60;
export const runtime = "nodejs";

interface Body { url: string; addToPlan?: { plan_id: string; date: string; slot: string } }

const SYSTEM = `Du extraherar svenska recept från råa HTML-sidor. Användaren ger dig text från en receptsida (koket.se, ica.se, alltommat.se, NYT Cooking, etc.). Du ska identifiera receptet och returnera strukturerad JSON.

Returnera ENDAST JSON i kodblock:
\`\`\`json
{
  "title": "Receptets titel",
  "description": "1 mening",
  "servings": 4,
  "prep_minutes": 15,
  "cook_minutes": 30,
  "cuisine": "svensk|italiensk|...",
  "difficulty": "lätt|medel|svår",
  "tags": ["snabbt"],
  "instructions": ["Steg 1","Steg 2"],
  "ingredients": [{"name":"Kycklingfilé","quantity":600,"unit":"g","category":"kött"}]
}
\`\`\`

Översätt till svenska om källan är på engelska. Konvertera till metriska enheter (g, dl, ml, st). Justera till 4 portioner som standard om antalet skiljer.`;

export async function POST(req: Request) {
  const body = (await req.json()) as Body;
  if (!body.url?.startsWith("http")) return NextResponse.json({ error: "Giltig URL krävs" }, { status: 400 });

  // Hämta sidan
  let html: string;
  try {
    const r = await fetch(body.url, {
      headers: { "User-Agent": "Mozilla/5.0 (Sondag/0.1)" },
      signal: AbortSignal.timeout(15000),
    });
    if (!r.ok) return NextResponse.json({ error: `Kunde inte hämta sidan (${r.status})` }, { status: 502 });
    html = await r.text();
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Hämtningsfel" }, { status: 502 });
  }

  // Trunkera (Claude tar inte oändligt mycket)
  const stripped = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .slice(0, 50000);

  const supabase = await createClient();
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4000,
    system: SYSTEM,
    messages: [{ role: "user", content: `URL: ${body.url}\n\nHTML:\n${stripped}` }],
  });

  const text = message.content.filter((b) => b.type === "text").map((b) => (b as { text: string }).text).join("\n");
  const match = text.match(/```json\s*([\s\S]+?)\s*```/) || text.match(/(\{[\s\S]+\})/);
  if (!match) return NextResponse.json({ error: "AI kunde inte hitta något recept" }, { status: 502 });

  let recipe;
  try { recipe = JSON.parse(match[1]); } catch { return NextResponse.json({ error: "Kunde inte parsa receptet" }, { status: 502 }); }

  const img = recipeImage({
    title: recipe.title,
    description: recipe.description,
    cuisine: recipe.cuisine,
    tags: recipe.tags ?? [],
  });

  const { data: saved } = await supabase
    .from("sondag_recipes")
    .insert({
      household_id: HOUSEHOLD_ID,
      title: recipe.title,
      description: recipe.description,
      servings: recipe.servings ?? 4,
      prep_minutes: recipe.prep_minutes,
      cook_minutes: recipe.cook_minutes,
      cuisine: recipe.cuisine,
      difficulty: recipe.difficulty,
      tags: recipe.tags ?? [],
      instructions: recipe.instructions ?? [],
      ai_generated: false,
      saved: true,
      source_url: body.url,
      image_url: img.url,
      image_prompt: img.prompt,
      image_seed: img.seed,
    })
    .select()
    .single();

  if (!saved) return NextResponse.json({ error: "Kunde inte spara recept" }, { status: 500 });

  if (Array.isArray(recipe.ingredients)) {
    await supabase.from("sondag_recipe_ingredients").insert(
      recipe.ingredients.map((ing: { name: string; quantity: number | null; unit: string | null; category: string | null }, idx: number) => ({
        recipe_id: saved.id, name: ing.name, quantity: ing.quantity, unit: ing.unit, category: ing.category, order_index: idx,
      }))
    );
  }

  if (body.addToPlan) {
    await supabase.from("sondag_meal_plan_entries").upsert(
      { meal_plan_id: body.addToPlan.plan_id, date: body.addToPlan.date, slot: body.addToPlan.slot, recipe_id: saved.id, servings: recipe.servings ?? 4 },
      { onConflict: "meal_plan_id,date,slot" }
    );
  }

  await logActivity({
    verb: "added_pantry",
    object_type: "recipe",
    object_id: saved.id,
    object_name: recipe.title,
    payload: { source_url: body.url, imported: true },
  });

  return NextResponse.json({ ok: true, recipe: { id: saved.id, title: recipe.title } });
}
