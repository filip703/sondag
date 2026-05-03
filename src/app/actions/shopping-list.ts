"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { normalizeName } from "@/lib/utils";
import { logActivity } from "@/lib/activity";

export async function toggleCheckedAction(itemId: string, checked: boolean) {
  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("sondag_shopping_list_items")
    .select("name")
    .eq("id", itemId)
    .maybeSingle();
  await supabase.from("sondag_shopping_list_items").update({ checked }).eq("id", itemId);
  await logActivity({
    verb: checked ? "checked_off" : "unchecked",
    object_type: "shopping_item",
    object_id: itemId,
    object_name: existing?.name,
  });
  revalidatePath("/inkop");
}

export async function toggleHaveAtHomeAction(itemId: string, have: boolean) {
  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("sondag_shopping_list_items")
    .select("name")
    .eq("id", itemId)
    .maybeSingle();
  await supabase
    .from("sondag_shopping_list_items")
    .update({ have_at_home: have })
    .eq("id", itemId);
  if (have) {
    await logActivity({
      verb: "marked_have_at_home",
      object_type: "shopping_item",
      object_id: itemId,
      object_name: existing?.name,
    });
  }
  revalidatePath("/inkop");
}

export async function rememberAlwaysHaveItemAction(itemId: string, remember: boolean) {
  const supabase = await createClient();
  const { data: item } = await supabase
    .from("sondag_shopping_list_items")
    .select("*, sondag_shopping_lists!inner(household_id)")
    .eq("id", itemId)
    .single();

  if (!item) return;

  await supabase
    .from("sondag_shopping_list_items")
    .update({ remember_have_at_home: remember, have_at_home: remember || item.have_at_home })
    .eq("id", itemId);

  const householdId = (item.sondag_shopping_lists as { household_id: string }).household_id;

  if (remember) {
    await supabase.from("sondag_always_have_items").upsert(
      {
        household_id: householdId,
        name_normalized: normalizeName(item.name),
        display_name: item.name,
        category: item.category,
        ica_ean: item.ica_ean,
      },
      { onConflict: "household_id,name_normalized" }
    );
    await logActivity({
      verb: "remembered_always_have",
      object_type: "always_have_item",
      object_name: item.name,
    });
  } else {
    await supabase
      .from("sondag_always_have_items")
      .delete()
      .eq("household_id", householdId)
      .eq("name_normalized", normalizeName(item.name));
    await logActivity({
      verb: "removed_always_have",
      object_type: "always_have_item",
      object_name: item.name,
    });
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
  const { data } = await supabase
    .from("sondag_shopping_list_items")
    .insert({
      shopping_list_id: args.list_id,
      name: args.name,
      quantity: args.quantity ?? null,
      unit: args.unit ?? null,
      category: args.category ?? null,
    })
    .select()
    .single();
  await logActivity({
    verb: "added_shopping_item",
    object_type: "shopping_item",
    object_id: data?.id,
    object_name: args.name,
  });
  revalidatePath("/inkop");
}

export async function removeShoppingItemAction(itemId: string) {
  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("sondag_shopping_list_items")
    .select("name")
    .eq("id", itemId)
    .maybeSingle();
  await supabase.from("sondag_shopping_list_items").delete().eq("id", itemId);
  await logActivity({
    verb: "removed_shopping_item",
    object_type: "shopping_item",
    object_id: itemId,
    object_name: existing?.name,
  });
  revalidatePath("/inkop");
}
