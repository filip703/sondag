"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

interface SetEntryArgs {
  plan_id: string;
  date: string;
  slot: string;
  recipe_id?: string | null;
  custom_title?: string | null;
  takeaway?: boolean;
  takeaway_type?: string | null;
  takeaway_vendor?: string | null;
  takeaway_cost?: number | null;
  servings?: number;
}

export async function setEntryAction(args: SetEntryArgs) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("meal_plan_entries")
    .upsert(
      {
        meal_plan_id: args.plan_id,
        date: args.date,
        slot: args.slot,
        recipe_id: args.recipe_id ?? null,
        custom_title: args.custom_title ?? null,
        takeaway: args.takeaway ?? false,
        takeaway_type: args.takeaway_type ?? null,
        takeaway_vendor: args.takeaway_vendor ?? null,
        takeaway_cost: args.takeaway_cost ?? null,
        servings: args.servings ?? 4,
      },
      { onConflict: "meal_plan_id,date,slot" }
    );

  if (error) throw new Error(error.message);
  revalidatePath("/vecka");
}

export async function clearEntryAction(plan_id: string, date: string, slot: string) {
  const supabase = await createClient();
  await supabase
    .from("meal_plan_entries")
    .delete()
    .match({ meal_plan_id: plan_id, date, slot });
  revalidatePath("/vecka");
}
