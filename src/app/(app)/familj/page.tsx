import { redirect } from "next/navigation";
import { createClient, getCurrentHousehold } from "@/lib/supabase/server";
import { FamilyEditor } from "@/components/family-editor";

export const dynamic = "force-dynamic";

export default async function FamiljPage() {
  const household = await getCurrentHousehold();
  if (!household) redirect("/installningar");

  const supabase = await createClient();
  const { data: members } = await supabase
    .from("family_members")
    .select("*")
    .eq("household_id", household.household_id)
    .order("created_at", { ascending: true });

  const { data: profile } = await supabase
    .from("household_profile")
    .select("*")
    .eq("household_id", household.household_id)
    .maybeSingle();

  return (
    <div>
      <div className="mb-10">
        <p className="eyebrow mb-3">Familjen</p>
        <h1 className="text-4xl md:text-5xl">
          Vem äter <em className="text-rust">vad</em>.
        </h1>
        <p className="text-sm text-ink-soft mt-3 max-w-xl">
          Per-medlems-profiler. Allergier är absoluta. Älskar/gillar inte väger AI-genereringen.
          Selektiva ätare får komponenter separat.
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
