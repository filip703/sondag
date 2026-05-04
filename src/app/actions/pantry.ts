"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { normalizeName } from "@/lib/utils";
import { logActivity } from "@/lib/activity";
import { classifyStorage, type Storage } from "@/lib/storage-classify";

interface AddArgs {
  household_id: string;
  name: string;
  quantity: number | null;
  unit: string | null;
  category: string | null;
  storage?: Storage;
}

export async function addPantryItemAction(args: AddArgs) {
  const supabase = await createClient();
  const storage: Storage = args.storage ?? classifyStorage(args.category, args.name);
  const { data, error } = await supabase
    .from("sondag_pantry_items")
    .insert({ ...args, storage })
    .select()
    .single();
  if (error) throw new Error(error.message);
  await logActivity({
    verb: "added_pantry",
    object_type: "pantry_item",
    object_id: data?.id,
    object_name: `${args.name} → ${storage}`,
  });
  revalidatePath("/skafferi");
  revalidatePath("/aktivitet");
}

export async function movePantryItemAction(id: string, storage: Storage) {
  const supabase = await createClient();
  await supabase.from("sondag_pantry_items").update({ storage }).eq("id", id);
  revalidatePath("/skafferi");
}

export interface PantrySnapshot {
  household_id: string;
  name: string;
  quantity: number | null;
  unit: string | null;
  category: string | null;
  storage: Storage | null;
  ica_ean: string | null;
  expiry_date: string | null;
  notes: string | null;
}

export async function removePantryItemAction(id: string): Promise<PantrySnapshot | null> {
  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("sondag_pantry_items")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  await supabase.from("sondag_pantry_items").delete().eq("id", id);
  await logActivity({
    verb: "removed_pantry",
    object_type: "pantry_item",
    object_id: id,
    object_name: existing?.name,
  });
  revalidatePath("/skafferi");
  if (!existing) return null;
  return {
    household_id: existing.household_id,
    name: existing.name,
    quantity: existing.quantity,
    unit: existing.unit,
    category: existing.category,
    storage: existing.storage,
    ica_ean: existing.ica_ean,
    expiry_date: existing.expiry_date,
    notes: existing.notes,
  };
}

export async function restorePantryItemAction(snapshot: PantrySnapshot) {
  const supabase = await createClient();
  await supabase.from("sondag_pantry_items").insert(snapshot);
  revalidatePath("/skafferi");
}

export async function rememberAlwaysHaveAction(args: {
  household_id: string;
  name: string;
  category: string | null;
  ica_ean: string | null;
}) {
  const supabase = await createClient();
  await supabase.from("sondag_always_have_items").upsert(
    {
      household_id: args.household_id,
      name_normalized: normalizeName(args.name),
      display_name: args.name,
      category: args.category,
      ica_ean: args.ica_ean,
    },
    { onConflict: "household_id,name_normalized" }
  );
  await logActivity({
    verb: "remembered_always_have",
    object_type: "always_have_item",
    object_name: args.name,
  });
  revalidatePath("/skafferi");
  revalidatePath("/inkop");
}

export async function removeAlwaysHaveAction(id: string) {
  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("sondag_always_have_items")
    .select("display_name")
    .eq("id", id)
    .maybeSingle();
  await supabase.from("sondag_always_have_items").delete().eq("id", id);
  await logActivity({
    verb: "removed_always_have",
    object_type: "always_have_item",
    object_id: id,
    object_name: existing?.display_name,
  });
  revalidatePath("/skafferi");
}
