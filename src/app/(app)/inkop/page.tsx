import { redirect } from "next/navigation";
import { createClient, getCurrentHousehold } from "@/lib/supabase/server";
import { ShoppingListView } from "@/components/shopping-list-view";
import { startOfWeek, formatDateISO } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function InkopPage() {
  const household = await getCurrentHousehold();
  if (!household) redirect("/installningar");

  const supabase = await createClient();
  const weekStartIso = formatDateISO(startOfWeek(new Date()));

  // Hämta veckans plan
  const { data: plan } = await supabase
    .from("meal_plans")
    .select("id")
    .eq("household_id", household.household_id)
    .eq("week_start", weekStartIso)
    .maybeSingle();

  // Senaste aktiva eller skapa ny
  let { data: list } = await supabase
    .from("shopping_lists")
    .select("*")
    .eq("household_id", household.household_id)
    .in("status", ["active", "synced_to_ica"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!list) {
    const { data: newList } = await supabase
      .from("shopping_lists")
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
    .from("shopping_list_items")
    .select("*")
    .eq("shopping_list_id", list!.id)
    .order("category", { ascending: true })
    .order("order_index", { ascending: true });

  const { data: ica } = await supabase
    .from("ica_connections")
    .select("ica_username, default_store_name, last_synced_at")
    .eq("household_id", household.household_id)
    .maybeSingle();

  return (
    <div>
      <div className="mb-10 flex items-end justify-between">
        <div>
          <p className="eyebrow mb-3">Inköp</p>
          <h1 className="text-4xl md:text-5xl">
            Veckans <em className="text-rust">handling</em>.
          </h1>
          <p className="text-sm text-ink-soft mt-3 max-w-xl">
            Markera vad du redan har, kryssa av vad du tagit. Synka till ICA-handscannern när du är nöjd.
          </p>
        </div>
      </div>

      <ShoppingListView
        list={list!}
        items={items ?? []}
        householdId={household.household_id}
        ica={ica}
      />
    </div>
  );
}
