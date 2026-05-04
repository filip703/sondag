import { redirect } from "next/navigation";
import { createClient, getCurrentHousehold } from "@/lib/supabase/server";
import { FamilyEditor } from "@/components/family-editor";

export const dynamic = "force-dynamic";

export default async function FamiljPage() {
  const household = await getCurrentHousehold();
  if (!household) redirect("/installningar");

  const supabase = await createClient();
  const { data: members } = await supabase
    .from("sondag_family_members")
    .select("*")
    .eq("household_id", household.household_id)
    .order("created_at", { ascending: true });

  const { data: profile } = await supabase
    .from("sondag_household_profile")
    .select("*")
    .eq("household_id", household.household_id)
    .maybeSingle();

  return (
    <div>
      <div className="mb-12">
        <span className="section-no text-sm tabular-nums">No. 06</span>
        <h1 className="text-4xl md:text-5xl mt-2">
          Vem äter <em className="text-rust">vad</em>.
        </h1>
        <p className="text-sm text-ink-soft mt-3 italic max-w-xl">
          Allergier är absoluta. Älskar/gillar inte väger AI-genereringen. Selektiva ätare får komponenter separat.
        </p>
      </div>
      <FamilyEditor
        householdId={household.household_id}
        members={members ?? []}
        profile={profile}
      />
    </div>
  );
}
