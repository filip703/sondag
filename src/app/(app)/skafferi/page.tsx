import { redirect } from "next/navigation";
import { createClient, getCurrentHousehold } from "@/lib/supabase/server";
import { PantryList } from "@/components/pantry-list";
import { ScanButton } from "@/components/barcode-scanner";
import { CookWithPantryButton } from "@/components/cook-with-pantry";

export const dynamic = "force-dynamic";

export default async function SkafferiPage() {
  const household = await getCurrentHousehold();
  if (!household) redirect("/installningar");

  const supabase = await createClient();
  const { data: items } = await supabase
    .from("sondag_pantry_items")
    .select("*")
    .eq("household_id", household.household_id)
    .order("storage", { ascending: true })
    .order("category", { ascending: true })
    .order("name", { ascending: true });

  return (
    <div>
      <div className="mb-12 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
        <div>
          <span className="section-no text-sm tabular-nums">No. 03</span>
          <h1 className="text-4xl md:text-5xl mt-2">
            Vad finns <em className="text-rust">hemma</em>.
          </h1>
          <p className="text-sm text-ink-soft mt-3 italic max-w-xl">
            Skafferi, kyl och frys. Scanna en streckkod när du kommer hem så hamnar varan rätt automatiskt.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <ScanButton />
          <CookWithPantryButton />
        </div>
      </div>

      <PantryList
        householdId={household.household_id}
        items={items ?? []}
      />
    </div>
  );
}
