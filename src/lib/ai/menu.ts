import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

const RecipeIngredientSchema = z.object({
  name: z.string(),
  quantity: z.number().nullable(),
  unit: z.string().nullable(),
  category: z.string().nullable(),
});

const RecipeSchema = z.object({
  title: z.string(),
  description: z.string(),
  servings: z.number().default(4),
  prep_minutes: z.number().nullable(),
  cook_minutes: z.number().nullable(),
  cuisine: z.string().nullable(),
  difficulty: z.enum(["lätt", "medel", "svår"]),
  tags: z.array(z.string()),
  instructions: z.array(z.string()),
  ingredients: z.array(RecipeIngredientSchema),
});

const MealEntrySchema = z.object({
  date: z.string(),
  slot: z.enum(["frukost", "lunch", "middag"]),
  recipe: RecipeSchema.nullable(),
  takeaway: z.boolean().default(false),
  takeaway_type: z.string().nullable(),
});

const WeekPlanSchema = z.object({
  notes: z.string(),
  entries: z.array(MealEntrySchema),
});

export type GeneratedRecipe = z.infer<typeof RecipeSchema>;
export type GeneratedEntry = z.infer<typeof MealEntrySchema>;
export type GeneratedWeek = z.infer<typeof WeekPlanSchema>;

export interface GenerateMenuInput {
  weekStart: string; // ISO date (måndag)
  servings: number;
  preferences: {
    allergies: string[];
    dislikes: string[];
    diet_type: string | null;
    notes: string | null;
  };
  pantry: { name: string; quantity: number | null; unit: string | null }[];
  alwaysHave: string[];
  takeawayDays: { date: string; slot: string; type?: string }[];
}

const SYSTEM_PROMPT = `Du är en svensk hushållskock som planerar veckomenyer för svenska familjer.

Stil: vardagsmat — enkel, näringsrik, säsongsanpassad, hämtad från svenska och nordiska traditioner men öppen för internationella inslag (asiatiskt, italienskt, mexikanskt) när det passar.

Regler:
- Bara middagar, om inte annat anges
- 4 portioner som standard
- Varierat över veckan: aldrig samma proteinkälla två dagar i rad, max 2 vegetariska dagar (om inte preferens säger annat)
- Vardagar (mån-tors): 30 min eller mindre, snabba enkla rätter
- Fredag: lite roligare, gärna något barnen gillar (taco, burgare, pizza)
- Lördag: lite mer ambitiöst om kockaren vill, annars takeaway-vänligt
- Söndag: husmanskost — något långkok, gryta, eller söndagsstek
- Använd ingredienser som finns hemma där det går — markera vilka i ingredienslistan
- Svenska ingrediensnamn (kyckling, fläskfilé, grädde, smör, etc.)
- Mängder i metriska enheter (g, dl, ml, st)
- Kategorier på ingredienser: kött, fisk, mejeri, frukt-grönt, skafferi, frys, bröd

Output: JSON enligt schemat. Inga extra fält.`;

export async function generateWeekMenu(input: GenerateMenuInput): Promise<GeneratedWeek> {
  const client = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY!,
  });

  const userPrompt = buildPrompt(input);

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 8000,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userPrompt }],
  });

  const text = message.content
    .filter((b) => b.type === "text")
    .map((b) => (b as { text: string }).text)
    .join("\n");

  const jsonMatch = text.match(/```json\s*([\s\S]+?)\s*```/) || text.match(/(\{[\s\S]+\})/);
  if (!jsonMatch) throw new Error("Inget JSON-svar från Claude");

  const parsed = JSON.parse(jsonMatch[1]);
  return WeekPlanSchema.parse(parsed);
}

function buildPrompt(input: GenerateMenuInput): string {
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(input.weekStart);
    d.setDate(d.getDate() + i);
    return d.toISOString().slice(0, 10);
  });

  const takeawayMap = new Map(
    input.takeawayDays.map((t) => [`${t.date}-${t.slot}`, t.type ?? "takeaway"])
  );

  return `Planera veckans middagar för måndag ${input.weekStart} till söndag ${days[6]}.

ANTAL PORTIONER: ${input.servings}

PREFERENSER:
${input.preferences.diet_type ? `- Kost: ${input.preferences.diet_type}` : ""}
${input.preferences.allergies.length ? `- Allergier (UNDVIK STRIKT): ${input.preferences.allergies.join(", ")}` : ""}
${input.preferences.dislikes.length ? `- Vi gillar inte: ${input.preferences.dislikes.join(", ")}` : ""}
${input.preferences.notes ? `- Övrigt: ${input.preferences.notes}` : ""}

FINNS HEMMA (använd där det går):
${input.pantry.length ? input.pantry.map((p) => `- ${p.name}${p.quantity ? ` (${p.quantity}${p.unit ?? ""})` : ""}`).join("\n") : "- Inget loggat"}

ALLTID HEMMA (anta att vi har): ${input.alwaysHave.length ? input.alwaysHave.join(", ") : "salt, peppar, olja"}

TAKEAWAY-KVÄLLAR (planera INTE recept dessa kvällar, sätt takeaway:true):
${takeawayMap.size ? Array.from(takeawayMap.entries()).map(([k, v]) => `- ${k}: ${v}`).join("\n") : "- Inga"}

Returnera JSON i detta exakta format (inga extra fält):

\`\`\`json
{
  "notes": "Kort kommentar om veckan, max 2 meningar",
  "entries": [
    {
      "date": "${days[0]}",
      "slot": "middag",
      "recipe": {
        "title": "Kycklingpasta med pesto och soltorkade tomater",
        "description": "Snabb vardagsrätt på 25 min.",
        "servings": ${input.servings},
        "prep_minutes": 10,
        "cook_minutes": 15,
        "cuisine": "italienskt",
        "difficulty": "lätt",
        "tags": ["snabbt", "barn"],
        "instructions": ["Steg 1", "Steg 2"],
        "ingredients": [
          {"name": "Kycklingfilé", "quantity": 500, "unit": "g", "category": "kött"},
          {"name": "Pasta", "quantity": 400, "unit": "g", "category": "skafferi"}
        ]
      },
      "takeaway": false,
      "takeaway_type": null
    }
  ]
}
\`\`\`

Generera en entry per dag (måndag-söndag), bara middag.`;
}
