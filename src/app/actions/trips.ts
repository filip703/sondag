"use server";

import { createClient } from "@/lib/supabase/server";
import { HOUSEHOLD_ID } from "@/lib/auth-pin";
import { revalidatePath } from "next/cache";
import { logActivity } from "@/lib/activity";

export async function addTripAction(args: {
  start_date: string;
  end_date: string;
  title?: string;
  notes?: string;
}) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("sondag_trip_periods")
    .insert({
      household_id: HOUSEHOLD_ID,
      start_date: args.start_date,
      end_date: args.end_date,
      title: args.title ?? "Borta",
      notes: args.notes ?? null,
    })
    .select()
    .single();

  await logActivity({
    verb: "added_member",
    object_type: "trip",
    object_id: data?.id,
    object_name: `${args.title ?? "Borta"} (${args.start_date} → ${args.end_date})`,
  });

  revalidatePath("/vecka");
  return data;
}

export async function removeTripAction(id: string) {
  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("sondag_trip_periods")
    .select("title, start_date, end_date")
    .eq("id", id)
    .maybeSingle();
  await supabase.from("sondag_trip_periods").delete().eq("id", id);
  await logActivity({
    verb: "removed_member",
    object_type: "trip",
    object_id: id,
    object_name: existing?.title ?? "resa",
  });
  revalidatePath("/vecka");
}
