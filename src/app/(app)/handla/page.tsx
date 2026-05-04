import { redirect } from "next/navigation";
import { createClient, getCurrentHousehold } from "@/lib/supabase/server";
import { startOfWeek, formatDateISO } from "@/lib/utils";
import { HandlaView } from "@/components/handla-view";

export const dynamic = "force-dynamic";

export default async function HandlaPage() {
  const household = await getCurrentHousehold();
  if (!household) redirect("/installningar");

  const supabase = await createClient();
  const weekStartIso = formatDateISO(startOfWeek(new Date()));

  const { data: plan } = await supabase
    .from("sondag_meal_plans")
    .select("id")
    .eq("household_id", household.household_id)
    .eq("week_start", weekStartIso)
    .maybeSingle();

  let { data: list } = await supabase
    .from("sondag_shopping_lists")
    .select("*")
    .eq("household_id", household.household_id)
    .in("status", ["active", "synced_to_ica"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!list) {
    const { data: newList } = await supabase
      .from("sondag_shopping_lists")
      .insert({
        household_id: household.household_id,
        meal_plan_id: plan?.id ?? null,
        name: "Veckohandling",
      })
      .select()
      .single();
    list = newList;
  }

  const { data: items } = await supabase
    .from("sondag_shopping_list_items")
    .select("*")
    .eq("shopping_list_id", list!.id);

  const { data: ica } = await supabase
    .from("sondag_ica_connections")
    .select("default_store_name, last_synced_at")
    .eq("household_id", household.household_id)
    .maybeSingle();

  return (
    <HandlaView
      list={list!}
      items={items ?? []}
      storeName={ica?.default_store_name ?? "Maxi ICA Stormarknad Häggvik"}
      lastSynced={ica?.last_synced_at ?? null}
      sectionNo="02"
    />
  );
}
