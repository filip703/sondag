import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { HOUSEHOLD_ID } from "@/lib/auth-pin";
import { ActorPicker } from "@/components/actor-picker";

export const dynamic = "force-dynamic";

export default async function ValjPage() {
  const supabase = await createClient();
  const { data: members } = await supabase
    .from("sondag_family_members")
    .select("id, name, role, avatar_color")
    .eq("household_id", HOUSEHOLD_ID)
    .order("created_at", { ascending: true });

  return (
    <main className="min-h-dvh flex items-center justify-center px-6">
      <div className="w-full max-w-2xl text-center">
        <Link href="/" className="font-display text-2xl block mb-12">
          Söndag
        </Link>
        <p className="eyebrow mb-3">Vem är du?</p>
        <h1 className="text-3xl mb-10">
          Välj din <em className="text-rust">profil</em>.
        </h1>
        <ActorPicker members={members ?? []} />
      </div>
    </main>
  );
}
