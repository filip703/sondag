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
  const [{ data: items }, { data: alwaysHave }] = await Promise.all([
    supabase
      .from("sondag_pantry_items")
      .select("*")
      .eq("household_id", household.household_id)
      .order("storage", { ascending: true })
      .order("category", { ascending: true })
      .order("name", { ascending: true }),
    supabase
      .from("sondag_always_have_items")
      .select("*")
      .eq("household_id", household.household_id)
      .order("display_name", { ascending: true }),
  ]);

  return (
    <div>
      <div className="mb-10 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
        <div>
          <p className="eyebrow mb-3">Skafferi</p>
          <h1 className="text-4xl md:text-5xl">
            Vad finns <em className="text-rust">hemma</em>.
          </h1>
          <p className="text-sm text-ink-soft mt-3 max-w-xl">
            Items markerade som "alltid hemma" filtreras automatiskt bort från inköpslistan.
            Scanna en streckkod för att lägga till snabbt.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <ScanButton target="pantry" label="Scanna nu hemma" />
          <ScanButton target="always_have" label="Scanna alltid-hemma" />
          <CookWithPantryButton />
        </div>
      </div>

      <PantryList
        householdId={household.household_id}
        items={items ?? []}
        alwaysHave={alwaysHave ?? []}
      />
    </div>
  );
}
