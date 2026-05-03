import { createClient } from "@/lib/supabase/server";
import { getActiveActor, HOUSEHOLD_ID } from "@/lib/auth-pin";
import type { ActivityVerb } from "@/lib/activity-labels";

export type { ActivityVerb } from "@/lib/activity-labels";
export { describeActivity } from "@/lib/activity-labels";

export interface LogActivityArgs {
  verb: ActivityVerb;
  object_type?: string;
  object_id?: string | null;
  object_name?: string | null;
  payload?: Record<string, unknown>;
}

export async function logActivity(args: LogActivityArgs) {
  const actor = await getActiveActor();
  const supabase = await createClient();
  await supabase.from("sondag_activity_log").insert({
    household_id: HOUSEHOLD_ID,
    actor_member_id: actor?.id ?? null,
    actor_name: actor?.name ?? "Någon",
    verb: args.verb,
    object_type: args.object_type ?? null,
    object_id: args.object_id ?? null,
    object_name: args.object_name ?? null,
    payload: args.payload ?? null,
  });
}
