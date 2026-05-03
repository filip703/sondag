"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { normalizeName } from "@/lib/utils";

interface AddArgs {
  household_id: string;
  name: string;
  quantity: number | null;
  unit: string | null;
  category: string | null;
}

export async function addPantryItemAction(args: AddArgs) {
  const supabase = await createClient();
  const { error } = await supabase.from("pantry_items").insert(args);
  if (error) throw new Error(error.message);
  revalidatePath("/skafferi");
}

export async function removePantryItemAction(id: string) {
  const supabase = await createClient();
  await supabase.from("pantry_items").delete().eq("id", id);
  revalidatePath("/skafferi");
}

export async function rememberAlwaysHaveAction(args: {
  household_id: string;
  name: string;
  category: string | null;
  ica_ean: string | null;
}) {
  const supabase = await createClient();
  await supabase.from("always_have_items").upsert(
    {
      household_id: args.household_id,
      name_normalized: normalizeName(args.name),
      display_name: args.name,
      category: args.category,
      ica_ean: args.ica_ean,
    },
    { onConflict: "household_id,name_normalized" }
  );
  revalidatePath("/skafferi");
  revalidatePath("/inkop");
}

export async function removeAlwaysHaveAction(id: string) {
  const supabase = await createClient();
  await supabase.from("always_have_items").delete().eq("id", id);
  revalidatePath("/skafferi");
}
