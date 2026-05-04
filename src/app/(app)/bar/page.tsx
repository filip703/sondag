import { createClient } from "@/lib/supabase/server";
import { HOUSEHOLD_ID } from "@/lib/auth-pin";
import { BarView } from "@/components/bar-view";

export const dynamic = "force-dynamic";

export default async function BarPage() {
  const supabase = await createClient();

  const { data: drinks } = await supabase
    .from("sondag_drinks")
    .select("*")
    .eq("household_id", HOUSEHOLD_ID)
    .order("signature", { ascending: false })
    .order("name", { ascending: true });

  const drinkIds = (drinks ?? []).map((d) => d.id);
  const { data: ingredients } = drinkIds.length
    ? await supabase
        .from("sondag_drink_ingredients")
        .select("*")
        .in("drink_id", drinkIds)
        .order("order_index", { ascending: true })
    : { data: [] };

  const { data: profile } = await supabase
    .from("sondag_bar_profile")
    .select("*")
    .eq("household_id", HOUSEHOLD_ID)
    .maybeSingle();

  return (
    <div>
      <div className="mb-12">
        <span className="section-no text-sm tabular-nums">No. 04</span>
        <h1 className="text-4xl md:text-5xl mt-2">
          Vad ska <em className="text-rust">mixas</em> ikväll.
        </h1>
        <p className="text-sm text-ink-soft mt-3 italic max-w-xl">
          Adult tiki möter modern boutique. Inga klubbdrinkar, ingen bubbel. Citrus, orgeat, deep flavors.
        </p>
      </div>
      <BarView drinks={drinks ?? []} ingredients={ingredients ?? []} profile={profile} />
    </div>
  );
}
