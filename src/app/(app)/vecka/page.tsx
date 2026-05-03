import { redirect } from "next/navigation";
import { createClient, getCurrentHousehold } from "@/lib/supabase/server";
import { startOfWeek, formatDateISO, weekdayName, shortDate } from "@/lib/utils";
import { WeekGrid } from "@/components/week-grid";
import { GenerateMenuButton } from "@/components/generate-menu-button";
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

  const supabase = await createClient();

  // Hämta eller skapa veckomeny
  let { data: plan } = await supabase
    .from("meal_plans")
    .select("*")
    .eq("household_id", household.household_id)
    .eq("week_start", weekStartIso)
    .maybeSingle();

  if (!plan) {
    const { data: newPlan } = await supabase
      .from("meal_plans")
      .insert({ household_id: household.household_id, week_start: weekStartIso })
      .select()
      .single();
    plan = newPlan;
  }

  const { data: entries } = await supabase
    .from("meal_plan_entries")
    .select("*, recipes(id, title, image_url, prep_minutes, cook_minutes)")
    .eq("meal_plan_id", plan!.id);

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  return (
    <div>
      <div className="flex items-end justify-between mb-10">
        <div>
          <p className="eyebrow mb-3">Vecka</p>
          <h1 className="text-4xl md:text-5xl">
            {shortDate(weekStart)} <em className="text-rust">—</em>{" "}
            {shortDate(days[6])}
          </h1>
          <p className="text-sm text-ink-soft mt-3">
            Frukost, lunch och middag för fyra. Markera takeaway där det passar.
          </p>
        </div>
        <Suspense>
          <GenerateMenuButton planId={plan!.id} />
        </Suspense>
      </div>

      <WeekGrid days={days} entries={entries ?? []} planId={plan!.id} />
    </div>
  );
}
