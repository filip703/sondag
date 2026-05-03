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
  todd_safe_components: z.array(z.string()).optional(), // separata komponenter Todd kan äta
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

export interface FamilyMemberInput {
  name: string;
  role: string;
  eats_red_meat: boolean;
  eats_fish: boolean;
  eats_chicken: boolean;
  eats_pork: boolean;
  vegetarian: boolean;
  vegan: boolean;
  allergies: string[];
  loves: string[];
  dislikes: string[];
  always_eats: string[];
  food_strategy: string | null;
  notes: string | null;
}

export interface HouseholdProfileInput {
  cooking_style: string | null;
  weekday_minutes_max: number;
  takeaway_per_week: number;
  weekly_recurring: Record<string, string>;
  flavor_profile: string[];
  avoid: string[];
  budget_level: string;
  notes: string | null;
}

export interface GenerateMenuInput {
  weekStart: string;
  servings: number;
  household: HouseholdProfileInput;
  members: FamilyMemberInput[];
  pantry: { name: string; quantity: number | null; unit: string | null }[];
  alwaysHave: string[];
  takeawayDays: { date: string; slot: string; type?: string }[];
  recentMeals?: { date: string; title: string; cuisine?: string | null }[];
}

const SYSTEM_PROMPT = `Du är en svensk hushållskock som planerar veckomenyer för svenska familjer.

KÄRNVÄRDERINGAR:
- Vardagsmat ska vara enkel, snabb och GOD ("håll-käften-gott" > nyttigt perfektionstänk)
- Smak före hälsa, men hälsa kommer naturligt
- Komfort och förutsägbarhet vinner över överraskningar på vardagar
- Helger får vara lite mer ambitiösa
- Respektera familjemedlemmars individuella preferenser STRIKT — det är viktigare än variation

REGLER:
- Bara middagar
- Standard 4 portioner, justera om annat anges
- Allergier ÄR ABSOLUTA — aldrig förhandlingsbart
- Om en medlem inte äter en proteinkälla: använd den ALDRIG som huvudprotein
- Om en medlem är selektiv: planera så hens "safe components" finns separat på tallriken — tvinga aldrig ihop-rörda rätter
- Återkommande veckorutiner (t.ex. "fredag = sushi") ska följas såvida inte takeaway-dag säger annat
- Undvik upprepning: aldrig samma proteinkälla två dagar i rad
- Veta vad som finns hemma: använd dessa ingredienser där det går
- Svenska ingrediensnamn, metriska enheter, kategorier (kött, fisk, mejeri, frukt-grönt, skafferi, frys, bröd, snacks, dryck)

OUTPUT: JSON enligt schemat. Inga extra fält. Inga kommentarer utanför JSON.`;

export async function generateWeekMenu(input: GenerateMenuInput): Promise<GeneratedWeek> {
  const client = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY!,
  });

  const userPrompt = buildPrompt(input);

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 12000,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userPrompt }],
  });

  const text = message.content
    .filter((b) => b.type === "text")
    .map((b) => (b as { text: string }).text)
    .join("\n");

  const jsonMatch =
    text.match(/```json\s*([\s\S]+?)\s*```/) ||
    text.match(/(\{[\s\S]+\})/);
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

  const dayLabels = ["måndag", "tisdag", "onsdag", "torsdag", "fredag", "lördag", "söndag"];

  const takeawayMap = new Map(
    input.takeawayDays.map((t) => [`${t.date}-${t.slot}`, t.type ?? "takeaway"])
  );

  const memberBlocks = input.members
    .map((m) => {
      const meatStatus = [
        !m.eats_red_meat && "INTE rött kött",
        !m.eats_fish && "INTE fisk",
        !m.eats_chicken && "INTE kyckling",
        !m.eats_pork && "INTE fläsk",
        m.vegetarian && "vegetarian",
        m.vegan && "vegan",
      ]
        .filter(Boolean)
        .join(", ");

      return `### ${m.name} (${m.role})
${meatStatus ? `- Äter: ${meatStatus}` : ""}
${m.allergies.length ? `- Allergier (STRIKT UNDVIK): ${m.allergies.join(", ")}` : ""}
${m.loves.length ? `- Älskar: ${m.loves.join(", ")}` : ""}
${m.dislikes.length ? `- Gillar inte: ${m.dislikes.join(", ")}` : ""}
${m.always_eats.length ? `- Safe foods / vill alltid kunna äta: ${m.always_eats.join(", ")}` : ""}
${m.food_strategy ? `- STRATEGI: ${m.food_strategy}` : ""}
${m.notes ? `- Anteckningar: ${m.notes}` : ""}`.trim();
    })
    .join("\n\n");

  const recurringRules = Object.entries(input.household.weekly_recurring)
    .map(([day, rule]) => `- ${day}: ${rule}`)
    .join("\n");

  return `Planera veckans middagar för måndag ${days[0]} till söndag ${days[6]}.

ANTAL PORTIONER: ${input.servings}

═══════════════════════════════════════
HUSHÅLLETS MATSTIL
═══════════════════════════════════════

${input.household.cooking_style ?? "(ingen specifik stil)"}

- Vardagsmat (mån-tors): max ${input.household.weekday_minutes_max} min totalt
- ${input.household.takeaway_per_week} takeaway-kvällar/vecka är OK
- Budget-nivå: ${input.household.budget_level}

ÅTERKOMMANDE VECKORUTINER (följ alltid):
${recurringRules || "(inga)"}

SMAKPROFIL ATT JOBBA MED:
${input.household.flavor_profile.length ? input.household.flavor_profile.map((f) => `- ${f}`).join("\n") : "(öppet)"}

UNDVIK:
${input.household.avoid.length ? input.household.avoid.map((a) => `- ${a}`).join("\n") : "(inget specifikt)"}

${input.household.notes ? `Övrigt: ${input.household.notes}` : ""}

═══════════════════════════════════════
FAMILJEMEDLEMMAR
═══════════════════════════════════════

${memberBlocks}

═══════════════════════════════════════
SKAFFERI & HEMMAFINNS
═══════════════════════════════════════

Finns just nu hemma (använd där det går):
${input.pantry.length ? input.pantry.map((p) => `- ${p.name}${p.quantity ? ` (${p.quantity}${p.unit ?? ""})` : ""}`).join("\n") : "(inget loggat)"}

Antas alltid finnas hemma:
${input.alwaysHave.length ? input.alwaysHave.map((a) => `- ${a}`).join("\n") : "(salt, peppar, olja)"}

═══════════════════════════════════════
SENASTE 4 VECKORNA — UNDVIK UPPREPNING
═══════════════════════════════════════

${input.recentMeals && input.recentMeals.length
  ? input.recentMeals.map((m) => `- ${m.date}: ${m.title}${m.cuisine ? ` (${m.cuisine})` : ""}`).join("\n")
  : "(ingen historik än)"}

Återanvänd inte exakta recept från ovan. Variera proteinkällor och kök så det inte blir samma som senast.

═══════════════════════════════════════
TAKEAWAY-KVÄLLAR (planera INTE recept)
═══════════════════════════════════════

${takeawayMap.size ? Array.from(takeawayMap.entries()).map(([k, v]) => `- ${k}: ${v}`).join("\n") : "(inga markerade — du får föreslå själv om veckorutinerna säger något)"}

═══════════════════════════════════════
OUTPUT
═══════════════════════════════════════

Returnera JSON i detta exakta format. En entry per dag (${dayLabels.join(", ")}), bara middag.

För selektiva ätare (som Todd): inkludera \`todd_safe_components\` med vad hen kan äta från rätten ELLER vad som ska serveras separat.

\`\`\`json
{
  "notes": "Kort kommentar om veckans tanke, max 2 meningar",
  "entries": [
    {
      "date": "${days[0]}",
      "slot": "middag",
      "recipe": {
        "title": "Crispy chicken wraps",
        "description": "Snabb fredagsfeeling på vardag.",
        "servings": ${input.servings},
        "prep_minutes": 15,
        "cook_minutes": 15,
        "cuisine": "streetfood",
        "difficulty": "lätt",
        "tags": ["snabbt", "barn", "comfort"],
        "instructions": ["Steg 1", "Steg 2"],
        "ingredients": [
          {"name": "Kycklingfilé", "quantity": 600, "unit": "g", "category": "kött"},
          {"name": "Tortillas", "quantity": 8, "unit": "st", "category": "bröd"}
        ],
        "todd_safe_components": ["kyckling utan sås separat", "tortilla"]
      },
      "takeaway": false,
      "takeaway_type": null
    }
  ]
}
\`\`\``;
}
