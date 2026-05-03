"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { normalizeName } from "@/lib/utils";

export async function toggleCheckedAction(itemId: string, checked: boolean) {
  const supabase = await createClient();
  await supabase.from("shopping_list_items").update({ checked }).eq("id", itemId);
  revalidatePath("/inkop");
}

export async function toggleHaveAtHomeAction(itemId: string, have: boolean) {
  const supabase = await createClient();
  await supabase
    .from("shopping_list_items")
    .update({ have_at_home: have })
    .eq("id", itemId);
  revalidatePath("/inkop");
}

export async function rememberAlwaysHaveItemAction(itemId: string, remember: boolean) {
  const supabase = await createClient();

  // Hämta itemet
  const { data: item } = await supabase
    .from("shopping_list_items")
    .select("*, shopping_lists!inner(household_id)")
    .eq("id", itemId)
    .single();

  if (!item) return;

  await supabase
    .from("shopping_list_items")
    .update({ remember_have_at_home: remember, have_at_home: remember || item.have_at_home })
    .eq("id", itemId);

  if (remember) {
    const householdId = (item.shopping_lists as { household_id: string }).household_id;
    await supabase.from("always_have_items").upsert(
      {
        household_id: householdId,
        name_normalized: normalizeName(item.name),
        display_name: item.name,
        category: item.category,
        ica_ean: item.ica_ean,
      },
      { onConflict: "household_id,name_normalized" }
    );
  } else {
    const householdId = (item.shopping_lists as { household_id: string }).household_id;
    await supabase
      .from("always_have_items")
      .delete()
      .eq("household_id", householdId)
      .eq("name_normalized", normalizeName(item.name));
  }

  revalidatePath("/inkop");
  revalidatePath("/skafferi");
}

export async function addShoppingItemAction(args: {
  list_id: string;
  name: string;
  quantity?: number;
  unit?: string;
  category?: string;
}) {
  const supabase = await createClient();
  await supabase.from("shopping_list_items").insert({
    shopping_list_id: args.list_id,
    name: args.name,
    quantity: args.quantity ?? null,
    unit: args.unit ?? null,
    category: args.category ?? null,
  });
  revalidatePath("/inkop");
}

export async function removeShoppingItemAction(itemId: string) {
  const supabase = await createClient();
  await supabase.from("shopping_list_items").delete().eq("id", itemId);
  revalidatePath("/inkop");
}
