import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { HOUSEHOLD_ID } from "@/lib/auth-pin";

// PIN-mode: en enkel klient med anon-key. RLS är öppen för sondag-schemat
// och PIN-gaten i middleware skyddar appen.
export async function createClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: { persistSession: false, autoRefreshToken: false },
    }
  );
}

export async function getCurrentHousehold() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("sondag_households")
    .select("id, name")
    .eq("id", HOUSEHOLD_ID)
    .maybeSingle();
  return data ? { household_id: data.id, households: { id: data.id, name: data.name } } : null;
}

export async function getCurrentUser() {
  // PIN-mode har ingen riktig user, vi returnerar en proxy.
  return { id: HOUSEHOLD_ID, email: "filiphector@gmail.com" };
}
