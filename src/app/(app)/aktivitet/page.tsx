import { createClient } from "@/lib/supabase/server";
import { HOUSEHOLD_ID } from "@/lib/auth-pin";
import { ActivityFeed } from "@/components/activity-feed";

export const dynamic = "force-dynamic";

export default async function AktivitetPage() {
  const supabase = await createClient();
  const { data: items } = await supabase
    .from("sondag_activity_log")
    .select("*")
    .eq("household_id", HOUSEHOLD_ID)
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <div>
      <div className="mb-12">
        <span className="section-no text-sm tabular-nums">No. 07</span>
        <h1 className="text-4xl md:text-5xl mt-2">
          Vad <em className="text-rust">händer</em> i hushållet.
        </h1>
        <p className="text-sm text-ink-soft mt-3 italic max-w-xl">
          Senaste 200 händelserna. Vem gjorde vad, när.
        </p>
      </div>
      <ActivityFeed items={items ?? []} />
    </div>
  );
}
