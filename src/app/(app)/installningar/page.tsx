import { redirect } from "next/navigation";
import { createClient, getCurrentHousehold, getCurrentUser } from "@/lib/supabase/server";
import { SettingsForm } from "@/components/settings-form";
import { CreateHousehold } from "@/components/create-household";
import { IcaConnect } from "@/components/ica-connect";

export const dynamic = "force-dynamic";

export default async function InstallningarPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const household = await getCurrentHousehold();

  if (!household) {
    return (
      <div className="max-w-md">
        <p className="eyebrow mb-3">Kom igång</p>
        <h1 className="text-4xl mb-4">Skapa hushåll</h1>
        <p className="text-sm text-ink-soft mb-8">
          Ett hushåll innehåller veckomeny, skafferi och inköpslista. Du kan bjuda in Tine senare.
        </p>
        <CreateHousehold userId={user.id} />
      </div>
    );
  }

  const supabase = await createClient();
  const { data: prefs } = await supabase
    .from("diet_preferences")
    .select("*")
    .eq("household_id", household.household_id)
    .eq("user_id", user.id)
    .maybeSingle();

  const { data: ica } = await supabase
    .from("ica_connections")
    .select("*")
    .eq("household_id", household.household_id)
    .maybeSingle();

  return (
    <div className="grid md:grid-cols-2 gap-12">
      <div>
        <p className="eyebrow mb-3">Inställningar</p>
        <h1 className="text-4xl mb-8">Preferenser</h1>
        <SettingsForm
          householdId={household.household_id}
          userId={user.id}
          initial={prefs}
        />
      </div>
      <div id="ica">
        <p className="eyebrow mb-3">Integrationer</p>
        <h1 className="text-4xl mb-8">ICA</h1>
        <IcaConnect householdId={household.household_id} initial={ica} />
      </div>
    </div>
  );
}
