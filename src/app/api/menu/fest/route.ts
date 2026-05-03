import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { HOUSEHOLD_ID } from "@/lib/auth-pin";
import { logActivity } from "@/lib/activity";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 60;
export const runtime = "nodejs";

interface Body {
  date: string;
  guest_count: number;
  vibe?: string;
  notes?: string;
  regenerate_course?: "predrink" | "starter" | "main" | "dessert";
  fest_id?: string;
}

const SYSTEM = `Du designar en festmiddag åt familjen Hectorsen i Stockholm. Stilen är "premium casual + boutique hotel + Palma rooftop + adult tiki". Inga klubbkvällar, inga sparkling-drinkar, inget för svårt.

Returnera ENDAST JSON i kodblock — fyra kurser:
\`\`\`json
{
  "predrink": {
    "name": "Welcome cocktail-namn",
    "description": "Kort beskrivning",
    "base_spirit": "rom|tequila|gin|...",
    "glass_type": "coupé",
    "garnish": "...",
    "prep_minutes": 5,
    "ingredients": [{"name":"Rom","quantity":4.5,"unit":"cl","category":"spirit"}],
    "instructions": ["Steg 1","Steg 2"]
  },
  "starter": {
    "title": "Förrättens namn",
    "description": "1 mening",
    "servings": 6,
    "prep_minutes": 15,
    "cook_minutes": 10,
    "cuisine": "...",
    "difficulty": "lätt|medel|svår",
    "tags": ["fest","förrätt"],
    "instructions": ["Steg 1"],
    "ingredients": [{"name":"X","quantity":200,"unit":"g","category":"kött"}]
  },
  "main": { ...samma format som starter },
  "dessert": { ...samma format, men kan vara enklare. tags: ["dessert"] }
}
\`\`\`

Regler:
- Anpassa portioner efter angivet gäst-antal
- Förrätt: lättare, ofta cold plate eller liten sak
- Varmrätt: showstopper, värd kvällen — gärna OFYR/grillat eller en imponerande pasta/biff
- Dessert: ENKEL — t.ex. tre-ingrediens-tiramisu, glass med något smart, choklad-fudge — inget bakverk
- Pre-drink: matchar maten, sätter tonen, inte för stark
- Tine äter inte rött kött → om huvudrätten är högrev/biff, planera en parallell vegetarisk eller fisk-version i instructions
- Hela menyn ska kunna lagas av en kock, inte två. Smart prep.
- Svenska, metriska enheter, kategorier (kött, fisk, mejeri, frukt-grönt, skafferi, frys, bröd, snacks, dryck, spirit)`;

export async function POST(req: Request) {
  const body = (await req.json()) as Body;
  const supabase = await createClient();

  const { data: members } = await supabase
    .from("sondag_family_members")
    .select("name, eats_red_meat, eats_fish, eats_chicken, vegetarian, allergies, loves, dislikes")
    .eq("household_id", HOUSEHOLD_ID);

  const restrictions = (members ?? [])
    .map((m) => {
      const r: string[] = [];
      if (!m.eats_red_meat) r.push("ej rött kött");
      if (!m.eats_fish) r.push("ej fisk");
      if (!m.eats_chicken) r.push("ej kyckling");
      if (m.vegetarian) r.push("vegetarian");
      if (m.allergies?.length) r.push(`allergier: ${m.allergies.join(", ")}`);
      return r.length ? `${m.name}: ${r.join(", ")}` : null;
    })
    .filter(Boolean);

  const userMsg = `Datum: ${body.date}
Gäster: ${body.guest_count} personer
Vibe: ${body.vibe ?? "OFYR-kväll, premium casual"}
${body.notes ? `Anteckningar: ${body.notes}` : ""}

Familjens kostbegränsningar:
${restrictions.length ? restrictions.join("\n") : "Inga"}

${body.regenerate_course ? `OBS: regenerera ENBART kurs "${body.regenerate_course}". De andra kurserna behöver inte fyllas i, returnera dem som null.` : "Returnera alla fyra kurser."}`;

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 8000,
    system: SYSTEM,
    messages: [{ role: "user", content: userMsg }],
  });

  const text = message.content.filter((b) => b.type === "text").map((b) => (b as { text: string }).text).join("\n");
  const match = text.match(/```json\s*([\s\S]+?)\s*```/) || text.match(/(\{[\s\S]+\})/);
  if (!match) return NextResponse.json({ error: "AI gav inget JSON-svar" }, { status: 502 });

  let parsed: { predrink?: PreDrinkData | null; starter?: CourseData | null; main?: CourseData | null; dessert?: CourseData | null };
  try { parsed = JSON.parse(match[1]); } catch { return NextResponse.json({ error: "Kunde inte parsa svaret" }, { status: 502 }); }

  // Spara/uppdatera fest_events
  let festId = body.fest_id;
  if (!festId) {
    const { data: fest } = await supabase
      .from("sondag_fest_events")
      .insert({
        household_id: HOUSEHOLD_ID,
        date: body.date,
        guest_count: body.guest_count,
        vibe: body.vibe ?? null,
        notes: body.notes ?? null,
      })
      .select()
      .single();
    festId = fest?.id;
  }
  if (!festId) return NextResponse.json({ error: "Kunde inte spara fest" }, { status: 500 });

  const updates: Record<string, string | null> = {};

  if (parsed.predrink) {
    const drinkId = await saveDrink(supabase, parsed.predrink);
    updates.predrink_drink_id = drinkId;
  }
  if (parsed.starter) updates.starter_recipe_id = await saveRecipe(supabase, parsed.starter, body.guest_count);
  if (parsed.main) updates.main_recipe_id = await saveRecipe(supabase, parsed.main, body.guest_count);
  if (parsed.dessert) updates.dessert_recipe_id = await saveRecipe(supabase, parsed.dessert, body.guest_count);

  if (Object.keys(updates).length) {
    await supabase.from("sondag_fest_events").update(updates).eq("id", festId);
  }

  await logActivity({
    verb: "generated_menu",
    object_type: "fest",
    object_id: festId,
    object_name: `Fest ${body.date} (${body.guest_count} pers)`,
    payload: { regenerated: body.regenerate_course ?? "all" },
  });

  return NextResponse.json({ ok: true, fest_id: festId });
}

interface PreDrinkData {
  name: string;
  description: string;
  base_spirit: string;
  glass_type: string;
  garnish: string;
  prep_minutes: number;
  ingredients?: Array<{ name: string; quantity: number | null; unit: string | null; category: string | null }>;
  instructions?: string[];
}

interface CourseData {
  title: string;
  description: string;
  servings: number;
  prep_minutes: number;
  cook_minutes: number;
  cuisine: string;
  difficulty: string;
  tags: string[];
  instructions: string[];
  ingredients: Array<{ name: string; quantity: number | null; unit: string | null; category: string | null }>;
}

async function saveDrink(supabase: Awaited<ReturnType<typeof createClient>>, d: PreDrinkData): Promise<string | null> {
  const { data: saved } = await supabase
    .from("sondag_drinks")
    .insert({
      household_id: HOUSEHOLD_ID,
      name: d.name,
      description: d.description,
      base_spirit: d.base_spirit,
      glass_type: d.glass_type,
      garnish: d.garnish,
      prep_minutes: d.prep_minutes,
      instructions: d.instructions ?? [],
      ai_generated: true,
      saved: false,
    })
    .select()
    .single();
  if (!saved) return null;
  if (Array.isArray(d.ingredients)) {
    await supabase.from("sondag_drink_ingredients").insert(
      d.ingredients.map((ing, idx) => ({ drink_id: saved.id, name: ing.name, quantity: ing.quantity, unit: ing.unit, category: ing.category, order_index: idx }))
    );
  }
  return saved.id;
}

async function saveRecipe(supabase: Awaited<ReturnType<typeof createClient>>, r: CourseData, servings: number): Promise<string | null> {
  const { data: saved } = await supabase
    .from("sondag_recipes")
    .insert({
      household_id: HOUSEHOLD_ID,
      title: r.title,
      description: r.description,
      servings: r.servings ?? servings,
      prep_minutes: r.prep_minutes,
      cook_minutes: r.cook_minutes,
      cuisine: r.cuisine,
      difficulty: r.difficulty,
      tags: r.tags ?? [],
      instructions: r.instructions ?? [],
      ai_generated: true,
    })
    .select()
    .single();
  if (!saved) return null;
  if (Array.isArray(r.ingredients)) {
    await supabase.from("sondag_recipe_ingredients").insert(
      r.ingredients.map((ing, idx) => ({ recipe_id: saved.id, name: ing.name, quantity: ing.quantity, unit: ing.unit, category: ing.category, order_index: idx }))
    );
  }
  return saved.id;
}
