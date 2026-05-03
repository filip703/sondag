import { redirect } from "next/navigation";
import { createClient, getCurrentHousehold } from "@/lib/supabase/server";
import { PantryList } from "@/components/pantry-list";

export const dynamic = "force-dynamic";

export default async function SkafferiPage() {
  const household = await getCurrentHousehold();
  if (!household) redirect("/installningar");

  const supabase = await createClient();
  const { data: items } = await supabase
    .from("pantry_items")
    .select("*")
    .eq("household_id", household.household_id)
    .order("category", { ascending: true })
    .order("name", { ascending: true });

  const { data: alwaysHave } = await supabase
    .from("always_have_items")
    .select("*")
    .eq("household_id", household.household_id)
    .order("display_name", { ascending: true });

  return (
    <div>
      <div className="mb-10">
        <p className="eyebrow mb-3">Skafferi</p>
        <h1 className="text-4xl md:text-5xl">
          Vad finns <em className="text-rust">hemma</em>.
        </h1>
        <p className="text-sm text-ink-soft mt-3 max-w-xl">
          Det här används för att veta vad som inte behöver köpas.
          Items du markerat som "alltid hemma" filtreras automatiskt bort från inköpslistan.
        </p>
      </div>

      <PantryList
        householdId={household.household_id}
        items={items ?? []}
        alwaysHave={alwaysHave ?? []}
      />
    </div>
  );
}
