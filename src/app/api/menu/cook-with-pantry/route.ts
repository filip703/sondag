import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { HOUSEHOLD_ID } from "@/lib/auth-pin";
import { logActivity } from "@/lib/activity";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 60;
export const runtime = "nodejs";

const SYSTEM = `Du är en svensk hushållskock som föreslår vad familjen kan laga av det de redan har hemma. Inga inköp ska behövas (förutom kanske färska örter, salt/peppar/olja som alltid antas finnas).

Returnera 3 förslag som JSON i kodblock:
\`\`\`json
{
  "suggestions": [
    {
      "title": "Snabb kycklingpasta",
      "description": "10 min, allt finns hemma.",
      "uses_pantry": ["Kycklingfilé","Pasta","Parmesan","Crème fraîche"],
      "extra_needed": [],
      "prep_minutes": 10,
      "cook_minutes": 15,
      "instructions_short": ["Koka pasta","Stek kyckling","Blanda med crème fraîche och parmesan"]
    }
  ]
}
\`\`\`

Regler:
- Bygg ENBART på det som finns i listan nedan
- Om något färskt saknas (lök, örter), markera det i "extra_needed"
- Korta instruktioner — inte fulla recept, bara nyckelsteg
- Svenska
- Anpassa efter familjens preferenser om det är möjligt`;

export async function POST(req: Request) {
  void req;
  const supabase = await createClient();

  const [{ data: pantry }, { data: alwaysHave }, { data: members }] = await Promise.all([
    supabase
      .from("sondag_pantry_items")
      .select("name, quantity, unit, category")
      .eq("household_id", HOUSEHOLD_ID),
    supabase
      .from("sondag_always_have_items")
      .select("display_name, category")
      .eq("household_id", HOUSEHOLD_ID),
    supabase
      .from("sondag_family_members")
      .select("name, eats_red_meat, eats_fish, eats_chicken, vegetarian, allergies, loves, dislikes")
      .eq("household_id", HOUSEHOLD_ID),
  ]);

  if (!pantry?.length && !alwaysHave?.length) {
    return NextResponse.json({ error: "Inget loggat hemma. Lägg till saker i Skafferiet först." }, { status: 400 });
  }

  const memberSummary = (members ?? [])
    .map((m) => {
      const restrictions: string[] = [];
      if (!m.eats_red_meat) restrictions.push("ej rött kött");
      if (!m.eats_fish) restrictions.push("ej fisk");
      if (!m.eats_chicken) restrictions.push("ej kyckling");
      if (m.vegetarian) restrictions.push("vegetarian");
      if (m.allergies?.length) restrictions.push(`allergier: ${m.allergies.join(", ")}`);
      return `${m.name}${restrictions.length ? ` (${restrictions.join(", ")})` : ""}`;
    })
    .join(", ");

  const userMsg = `Vad kan vi laga ikväll? Familjen är ${memberSummary || "fyra personer"}.

ALLTID HEMMA:
${(alwaysHave ?? []).map((a) => `- ${a.display_name}${a.category ? ` (${a.category})` : ""}`).join("\n") || "(inget loggat)"}

LOGGAT I SKAFFERIET JUST NU:
${(pantry ?? []).map((p) => `- ${p.name}${p.quantity ? ` (${p.quantity}${p.unit ?? ""})` : ""}`).join("\n") || "(inget loggat)"}

Föreslå 3 olika rätter — gärna varierade (en pasta, en wrap, en bowl, etc.).`;

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 3000,
    system: SYSTEM,
    messages: [{ role: "user", content: userMsg }],
  });

  const text = message.content.filter((b) => b.type === "text").map((b) => (b as { text: string }).text).join("\n");
  const match = text.match(/```json\s*([\s\S]+?)\s*```/) || text.match(/(\{[\s\S]+\})/);
  if (!match) return NextResponse.json({ error: "AI gav inget JSON-svar" }, { status: 502 });

  let parsed;
  try { parsed = JSON.parse(match[1]); } catch { return NextResponse.json({ error: "Kunde inte parsa svaret" }, { status: 502 }); }

  await logActivity({
    verb: "generated_menu",
    object_type: "cook_from_pantry",
    object_name: "föreslog vad-vi-kan-laga",
    payload: { count: parsed.suggestions?.length ?? 0 },
  });

  return NextResponse.json(parsed);
}
