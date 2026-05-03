import { redirect } from "next/navigation";
import { createClient, getCurrentHousehold } from "@/lib/supabase/server";
import { startOfWeek, formatDateISO, shortDate } from "@/lib/utils";
import { WeekGrid } from "@/components/week-grid";
import { GenerateMenuButton } from "@/components/generate-menu-button";
import { WeekSwitcher } from "@/components/week-switcher";
import { ImportRecipeButton } from "@/components/import-recipe-button";
import { Suspense } from "react";

export const dynamic = "force-dynamic";

export default async function VeckaPage({
  searchParams,
}: {
  searchParams: Promise<{ vecka?: string }>;
}) {
  const params = await searchParams;
  const household = await getCurrentHousehold();
  if (!household) redirect("/installningar");

  const weekStart = params.vecka
    ? new Date(params.vecka)
    : startOfWeek(new Date());
  const weekStartIso = formatDateISO(weekStart);
  const isCurrentWeek = formatDateISO(startOfWeek(new Date())) === weekStartIso;
  const prevWeek = new Date(weekStart); prevWeek.setDate(prevWeek.getDate() - 7);
  const nextWeek = new Date(weekStart); nextWeek.setDate(nextWeek.getDate() + 7);

  const supabase = await createClient();

  // Hämta eller skapa veckomeny
  let { data: plan } = await supabase
    .from("sondag_meal_plans")
    .select("*")
    .eq("household_id", household.household_id)
    .eq("week_start", weekStartIso)
    .maybeSingle();

  if (!plan) {
    const { data: newPlan } = await supabase
      .from("sondag_meal_plans")
      .insert({ household_id: household.household_id, week_start: weekStartIso })
      .select()
      .single();
    plan = newPlan;
  }

  // Hämta entries och recept parallellt
  const { data: entries } = await supabase
    .from("sondag_meal_plan_entries")
    .select("*")
    .eq("meal_plan_id", plan!.id);

  const recipeIds = (entries ?? []).map((e) => e.recipe_id).filter((x): x is string => !!x);
  const [{ data: recipes }, { data: members }] = await Promise.all([
    recipeIds.length
      ? supabase.from("sondag_recipes").select("id, title, image_url, prep_minutes, cook_minutes").in("id", recipeIds)
      : Promise.resolve({ data: [] as { id: string; title: string; image_url: string | null; prep_minutes: number | null; cook_minutes: number | null }[] }),
    supabase
      .from("sondag_family_members")
      .select("id, name, avatar_color")
      .eq("household_id", household.household_id)
      .order("created_at", { ascending: true }),
  ]);

  const recipeById = new Map((recipes ?? []).map((r) => [r.id, r]));
  const enrichedEntries = (entries ?? []).map((e) => ({
    ...e,
    recipes: e.recipe_id ? recipeById.get(e.recipe_id) ?? null : null,
  }));

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  // Vecka-nummer enligt ISO 8601
  const weekNumber = getISOWeek(weekStart);

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-10">
        <div className="flex-1">
          <p className="eyebrow mb-3">
            Vecka {weekNumber}
            {isCurrentWeek && (
              <span className="ml-2 inline-block px-2 py-0.5 bg-rust text-cream text-[10px] rounded-sm normal-case tracking-normal">
                denna vecka
              </span>
            )}
          </p>
          <h1 className="text-4xl md:text-5xl">
            {shortDate(weekStart)} <em className="text-rust">—</em>{" "}
            {shortDate(days[6])}
          </h1>
          <p className="text-sm text-ink-soft mt-3">
            Frukost, lunch och middag för fyra. Markera takeaway eller skriv "gryta" så fixar AI:n.
          </p>
        </div>
        <div className="flex items-end gap-3">
          <WeekSwitcher
            currentIso={weekStartIso}
            prevIso={formatDateISO(prevWeek)}
            nextIso={formatDateISO(nextWeek)}
            isCurrentWeek={isCurrentWeek}
          />
          <Suspense>
            <GenerateMenuButton planId={plan!.id} />
          </Suspense>
        </div>
      </div>

      <div className="mb-6">
        <ImportRecipeButton />
      </div>

      <WeekGrid days={days} entries={enrichedEntries} planId={plan!.id} members={members ?? []} />
    </div>
  );
}

function getISOWeek(d: Date): number {
  const date = new Date(d);
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + 3 - ((date.getDay() + 6) % 7));
  const week1 = new Date(date.getFullYear(), 0, 4);
  return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
}
