import { createClient } from "@/lib/supabase/server";
import { HOUSEHOLD_ID } from "@/lib/auth-pin";
import { SkapView } from "@/components/skap-view";

export const dynamic = "force-dynamic";

export default async function SkapPage() {
  const supabase = await createClient();
  const { data: items } = await supabase
    .from("sondag_standard_pantry_items")
    .select("*")
    .eq("household_id", HOUSEHOLD_ID)
    .order("category", { ascending: true })
    .order("subcategory", { ascending: true })
    .order("name", { ascending: true });

  return (
    <div>
      <div className="mb-12">
        <span className="section-no text-sm tabular-nums">No. 05</span>
        <h1 className="text-4xl md:text-5xl mt-2">
          Vad ska <em className="text-rust">alltid</em> finnas hemma.
        </h1>
        <p className="text-sm text-ink-soft mt-3 italic max-w-xl">
          Komplett premium home bar plus grundprovianten. Markera "fyll på" på det som tagit slut.
        </p>
      </div>
      <SkapView items={items ?? []} />
    </div>
  );
}
