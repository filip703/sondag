import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { HOUSEHOLD_ID } from "@/lib/auth-pin";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 60;
export const runtime = "nodejs";

interface Body { prompt: string; meal_context?: string }

const SYSTEM = `Du är Filips personliga bartender. Stil: adult tiki möter modern boutique hotel. Premium casual. Lounge terrace energy. Palma rooftop vibes.

Filips smakprofil:
- Bas: rom, tequila (favoriter), gin/bourbon ibland
- Älskar: citrus, grapefruktbeska, tonic, orgeat, lime, citron, honung, djupa smaker, balanserad syra
- HATAR: mousserande vin i drinkar, överdrivet söta drinkar, klubbstil, sticka-i-himlen-färger
- Favoriter: Saturn, Tommy's Margarita, Mai Tai (real style), Whiskey Sour, Naked & Famous

Returnera ENDAST JSON i kodblock:
\`\`\`json
{
  "name": "Drinknamn",
  "description": "1-2 meningar om karaktären",
  "base_spirit": "rom|tequila|gin|bourbon|mezcal",
  "glass_type": "coupé|rocks|highball",
  "garnish": "kort beskrivning",
  "difficulty": "lätt|medel|svår",
  "prep_minutes": 5,
  "vibe": ["adult tiki","terrace"],
  "flavor_profile": ["citrus","orgeat","balanserad"],
  "ingredients": [
    {"name":"Rom","quantity":4.5,"unit":"cl","category":"spirit"}
  ],
  "instructions": ["Steg 1","Steg 2"]
}
\`\`\`

Inga sparklingdrinkar. Inga söta klubbdrinkar.`;

export async function POST(req: Request) {
  const body = (await req.json()) as Body;
  if (!body.prompt?.trim()) return NextResponse.json({ error: "prompt krävs" }, { status: 400 });

  const supabase = await createClient();
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

  const userPrompt = `${body.prompt}${body.meal_context ? `\n\nServeras till: ${body.meal_context}` : ""}`;

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2500,
    system: SYSTEM,
    messages: [{ role: "user", content: userPrompt }],
  });

  const text = message.content.filter((b) => b.type === "text").map((b) => (b as { text: string }).text).join("\n");
  const match = text.match(/```json\s*([\s\S]+?)\s*```/) || text.match(/(\{[\s\S]+\})/);
  if (!match) return NextResponse.json({ error: "AI gav inget JSON-svar" }, { status: 502 });

  let drink;
  try { drink = JSON.parse(match[1]); } catch { return NextResponse.json({ error: "Kunde inte parsa svaret" }, { status: 502 }); }

  const { data: saved } = await supabase
    .from("sondag_drinks")
    .insert({
      household_id: HOUSEHOLD_ID,
      name: drink.name,
      description: drink.description,
      base_spirit: drink.base_spirit,
      glass_type: drink.glass_type,
      garnish: drink.garnish,
      difficulty: drink.difficulty,
      prep_minutes: drink.prep_minutes,
      vibe: drink.vibe ?? [],
      flavor_profile: drink.flavor_profile ?? [],
      instructions: drink.instructions ?? [],
      ai_generated: true,
      saved: false,
    })
    .select()
    .single();

  if (!saved) return NextResponse.json({ error: "Kunde inte spara drink" }, { status: 500 });

  if (Array.isArray(drink.ingredients)) {
    await supabase.from("sondag_drink_ingredients").insert(
      drink.ingredients.map((ing: { name: string; quantity: number | null; unit: string | null; category: string | null }, idx: number) => ({
        drink_id: saved.id, name: ing.name, quantity: ing.quantity, unit: ing.unit, category: ing.category, order_index: idx,
      }))
    );
  }

  return NextResponse.json({ ok: true, drink: { id: saved.id, name: drink.name } });
}
