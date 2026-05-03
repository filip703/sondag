"use server";

import { createClient } from "@/lib/supabase/server";
import { HOUSEHOLD_ID } from "@/lib/auth-pin";
import { revalidatePath } from "next/cache";
import { logActivity } from "@/lib/activity";
import { normalizeName } from "@/lib/utils";

export async function toggleRefillAction(id: string, needs: boolean) {
  const supabase = await createClient();
  await supabase.from("sondag_standard_pantry_items").update({ needs_refill: needs }).eq("id", id);
  revalidatePath("/skap");
}

export async function addStandardItemAction(args: { name: string; is_bar: boolean; category?: string }) {
  const supabase = await createClient();
  await supabase.from("sondag_standard_pantry_items").insert({
    household_id: HOUSEHOLD_ID,
    name: args.name,
    is_bar: args.is_bar,
    category: args.category ?? (args.is_bar ? "dryck" : "skafferi"),
  });
  await logActivity({ verb: "added_pantry", object_type: "standard_item", object_name: args.name });
  revalidatePath("/skap");
}

export async function removeStandardItemAction(id: string) {
  const supabase = await createClient();
  await supabase.from("sondag_standard_pantry_items").delete().eq("id", id);
  revalidatePath("/skap");
}

export async function exportRefillToShoppingAction(): Promise<number> {
  const supabase = await createClient();

  // Hämta alla refill-markerade
  const { data: items } = await supabase
    .from("sondag_standard_pantry_items")
    .select("*")
    .eq("household_id", HOUSEHOLD_ID)
    .eq("needs_refill", true);

  if (!items || items.length === 0) return 0;

  // Hitta eller skapa aktiv inköpslista
  let { data: list } = await supabase
    .from("sondag_shopping_lists")
    .select("id")
    .eq("household_id", HOUSEHOLD_ID)
    .in("status", ["active", "synced_to_ica"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!list) {
    const { data: newList } = await supabase
      .from("sondag_shopping_lists")
      .insert({ household_id: HOUSEHOLD_ID, name: "Veckohandling" })
      .select()
      .single();
    list = newList;
  }
  if (!list) return 0;

  // Lägg in items utan dubblar
  const { data: existing } = await supabase
    .from("sondag_shopping_list_items")
    .select("name")
    .eq("shopping_list_id", list.id);
  const existingNames = new Set((existing ?? []).map((e) => normalizeName(e.name)));

  const toInsert = items
    .filter((i) => !existingNames.has(normalizeName(i.name)))
    .map((i, idx) => ({
      shopping_list_id: list!.id,
      name: i.name,
      category: i.category,
      ica_ean: i.ica_ean ?? null,
      order_index: 2000 + idx,
      notes: "Skåp-refill",
    }));

  if (toInsert.length) {
    await supabase.from("sondag_shopping_list_items").insert(toInsert);
  }

  // Återställ refill-flaggan
  await supabase
    .from("sondag_standard_pantry_items")
    .update({ needs_refill: false })
    .eq("household_id", HOUSEHOLD_ID)
    .eq("needs_refill", true);

  await logActivity({
    verb: "added_pantry",
    object_type: "shopping_export",
    object_name: `${toInsert.length} skåp-items till handlingen`,
  });

  revalidatePath("/skap");
  revalidatePath("/handla");
  revalidatePath("/inkop");
  return toInsert.length;
}
