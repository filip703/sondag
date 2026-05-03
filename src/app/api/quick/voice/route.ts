import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { HOUSEHOLD_ID } from "@/lib/auth-pin";
import { logActivity } from "@/lib/activity";
import { classifyStorage } from "@/lib/storage-classify";
import { startOfWeek, formatDateISO } from "@/lib/utils";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 30;
export const runtime = "nodejs";

interface Body {
  text: string;
  key?: string;
  actor?: string;
}

const SYSTEM = `Du är en svensk röst-assistent för en familjeapp. Användaren talar in en kort fras via Siri/Shortcuts.

Du ska identifiera handlingen och returnera ENDAST JSON i kodblock:

\`\`\`json
{
  "action": "add_to_shopping" | "add_to_pantry" | "mark_takeaway" | "unknown",
  "items": [
    {"name": "Mjölk", "quantity": 1, "unit": "L"}
  ],
  "speak": "Lagt till mjölk på listan",
  "date": null,
  "slot": null
}
\`\`\`

Regler:
- "lägg till X på listan" → add_to_shopping
- "vi har X hemma" eller "lägg X i kylen/skafferiet/frysen" → add_to_pantry
- "vi tar pizza ikväll" → mark_takeaway (date=ikväll, slot=middag)
- Om frasen är otydlig → action="unknown", speak="Jag förstod inte"
- Standardenheter: "tre mjölk" → quantity:3 unit:"st", "en liter mjölk" → quantity:1 unit:"L"
- speak ska vara MAX 8 ord, naturligt svenskt`;

export async function POST(req: Request) {
  const body = (await req.json()) as Body;

  // Skydda endpoint med delad nyckel (Filip lägger den i sin Shortcut)
  const expectedKey = process.env.SONDAG_VOICE_KEY;
  if (expectedKey && body.key !== expectedKey) {
    return NextResponse.json({ error: "Fel nyckel", speak: "Fel nyckel" }, { status: 401 });
  }

  if (!body.text?.trim()) {
    return NextResponse.json({ error: "Ingen text", speak: "Jag hörde ingenting" }, { status: 400 });
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 800,
    system: SYSTEM,
    messages: [{ role: "user", content: body.text.trim() }],
  });

  const text = message.content
    .filter((b) => b.type === "text")
    .map((b) => (b as { text: string }).text)
    .join("\n");
  const match = text.match(/```json\s*([\s\S]+?)\s*```/) || text.match(/(\{[\s\S]+\})/);
  if (!match) {
    return NextResponse.json({ speak: "Jag förstod inte" }, { status: 200 });
  }

  let parsed: {
    action: string;
    items?: Array<{ name: string; quantity?: number; unit?: string }>;
    speak: string;
    date?: string | null;
    slot?: string | null;
  };
  try {
    parsed = JSON.parse(match[1]);
  } catch {
    return NextResponse.json({ speak: "Jag förstod inte" }, { status: 200 });
  }

  const supabase = await createClient();
  const actorName = body.actor ?? "Röst";

  if (parsed.action === "add_to_shopping" && parsed.items?.length) {
    // Hitta aktiv lista
    let { data: list } = await supabase
      .from("sondag_shopping_lists")
      .select("id")
      .eq("household_id", HOUSEHOLD_ID)
      .in("status", ["active", "synced_to_ica"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!list) {
      const { data: newList } = await supabase
        .from("sondag_shopping_lists")
        .insert({ household_id: HOUSEHOLD_ID, name: "Veckohandling" })
        .select()
        .single();
      list = newList;
    }
    if (list) {
      await supabase.from("sondag_shopping_list_items").insert(
        parsed.items.map((it, idx) => ({
          shopping_list_id: list!.id,
          name: it.name,
          quantity: it.quantity ?? 1,
          unit: it.unit ?? "st",
          order_index: 5000 + idx,
          notes: `Via röst (${actorName})`,
        }))
      );
    }
  } else if (parsed.action === "add_to_pantry" && parsed.items?.length) {
    await supabase.from("sondag_pantry_items").insert(
      parsed.items.map((it) => ({
        household_id: HOUSEHOLD_ID,
        name: it.name,
        quantity: it.quantity ?? 1,
        unit: it.unit ?? "st",
        storage: classifyStorage(null, it.name),
      }))
    );
  } else if (parsed.action === "mark_takeaway") {
    const today = parsed.date ?? formatDateISO(new Date());
    const weekStart = formatDateISO(startOfWeek(new Date(today)));
    let { data: plan } = await supabase
      .from("sondag_meal_plans")
      .select("id")
      .eq("household_id", HOUSEHOLD_ID)
      .eq("week_start", weekStart)
      .maybeSingle();
    if (!plan) {
      const { data: newPlan } = await supabase
        .from("sondag_meal_plans")
        .insert({ household_id: HOUSEHOLD_ID, week_start: weekStart })
        .select()
        .single();
      plan = newPlan;
    }
    if (plan) {
      const slot = parsed.slot ?? "middag";
      const type = parsed.items?.[0]?.name ?? "takeaway";
      await supabase
        .from("sondag_meal_plan_entries")
        .upsert(
          {
            meal_plan_id: plan.id,
            date: today,
            slot,
            takeaway: true,
            takeaway_type: type,
          },
          { onConflict: "meal_plan_id,date,slot" }
        );
    }
  }

  await logActivity({
    verb: "added_pantry",
    object_type: "voice_command",
    object_name: parsed.items?.map((i) => i.name).join(", ") ?? body.text,
    payload: { action: parsed.action, original_text: body.text, actor: actorName },
  });

  return NextResponse.json({ speak: parsed.speak ?? "OK" });
}
