"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function createHouseholdAction(args: { name: string; user_id: string }) {
  const supabase = await createClient();

  const { data: hh, error } = await supabase
    .from("households")
    .insert({ name: args.name, created_by: args.user_id })
    .select()
    .single();
  if (error) throw new Error(error.message);

  await supabase.from("household_members").insert({
    household_id: hh.id,
    user_id: args.user_id,
    role: "owner",
  });

  revalidatePath("/", "layout");
  return hh;
}

export async function setDietPreferencesAction(args: {
  household_id: string;
  user_id: string;
  allergies: string[];
  dislikes: string[];
  diet_type: string | null;
  notes: string | null;
}) {
  const supabase = await createClient();
  await supabase.from("diet_preferences").upsert(args);
  revalidatePath("/installningar");
}
