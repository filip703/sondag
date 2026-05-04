"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { logActivity } from "@/lib/activity";

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
    .from("sondag_meal_plan_entries")
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

  if (args.takeaway === true) {
    await logActivity({
      verb: "marked_takeaway",
      object_type: "meal_entry",
      object_name: `${args.date} ${args.slot}`,
      payload: { type: args.takeaway_type, vendor: args.takeaway_vendor },
    });
  } else if (args.takeaway === false) {
    await logActivity({
      verb: "cleared_takeaway",
      object_type: "meal_entry",
      object_name: `${args.date} ${args.slot}`,
    });
  }
  revalidatePath("/vecka");
}

export async function clearEntryAction(plan_id: string, date: string, slot: string) {
  const supabase = await createClient();
  await supabase
    .from("sondag_meal_plan_entries")
    .delete()
    .match({ meal_plan_id: plan_id, date, slot });
  revalidatePath("/vecka");
}

/**
 * Flytta en måltid från (date_from, slot_from) till (date_to, slot_to).
 * Om target redan har en entry: SWAP — innehållet byter plats.
 * Om target är tom: bara flytta.
 */
export async function moveEntryAction(args: {
  plan_id: string;
  date_from: string;
  slot_from: string;
  date_to: string;
  slot_to: string;
}) {
  const supabase = await createClient();

  if (args.date_from === args.date_to && args.slot_from === args.slot_to) return;

  const { data: source } = await supabase
    .from("sondag_meal_plan_entries")
    .select("*")
    .match({ meal_plan_id: args.plan_id, date: args.date_from, slot: args.slot_from })
    .maybeSingle();

  const { data: target } = await supabase
    .from("sondag_meal_plan_entries")
    .select("*")
    .match({ meal_plan_id: args.plan_id, date: args.date_to, slot: args.slot_to })
    .maybeSingle();

  if (!source) return;

  // Ta bort båda entries så vi kan skriva om utan PK-kollision
  await supabase
    .from("sondag_meal_plan_entries")
    .delete()
    .or(
      `and(date.eq.${args.date_from},slot.eq.${args.slot_from}),and(date.eq.${args.date_to},slot.eq.${args.slot_to})`
    )
    .eq("meal_plan_id", args.plan_id);

  // Skriv source till target-position
  await supabase.from("sondag_meal_plan_entries").insert({
    ...source,
    id: undefined,
    date: args.date_to,
    slot: args.slot_to,
  });

  // Om target hade innehåll, skriv det till source-position (swap)
  if (target) {
    await supabase.from("sondag_meal_plan_entries").insert({
      ...target,
      id: undefined,
      date: args.date_from,
      slot: args.slot_from,
    });
  }

  await logActivity({
    verb: "edited_member",
    object_type: "meal_entry",
    object_name: target
      ? `Bytte plats på ${args.date_from} ↔ ${args.date_to}`
      : `Flyttade till ${args.date_to}`,
    payload: { from: args.date_from, to: args.date_to, swap: !!target },
  });

  revalidatePath("/vecka");
}

export async function setAbsenceAction(args: {
  plan_id: string;
  date: string;
  slot: string;
  absent: string[];
}) {
  const supabase = await createClient();
  await supabase
    .from("sondag_meal_plan_entries")
    .upsert(
      {
        meal_plan_id: args.plan_id,
        date: args.date,
        slot: args.slot,
        absent_member_names: args.absent,
      },
      { onConflict: "meal_plan_id,date,slot" }
    );
  await logActivity({
    verb: "edited_member",
    object_type: "absence",
    object_name: args.absent.length ? `${args.absent.join(", ")} borta ${args.date}` : `alla hemma ${args.date}`,
    payload: { date: args.date, slot: args.slot, absent: args.absent },
  });
  revalidatePath("/vecka");
}
