"use server";

import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import {
  HECTOR_HOUSEHOLD_PROFILE,
  HECTOR_FAMILY_MEMBERS,
  HECTOR_ALWAYS_HAVE,
} from "@/lib/seeds/hector-family";

export async function createHouseholdAction(args: {
  name: string;
  user_id: string;
  use_hector_preset?: boolean;
}) {
  const supabase = await createClient();
  const user = await getCurrentUser();

  const { data: hh, error } = await supabase
    .from("sondag_households")
    .insert({ name: args.name, created_by: args.user_id })
    .select()
    .single();
  if (error) throw new Error(error.message);

  await supabase.from("sondag_household_members").insert({
    household_id: hh.id,
    user_id: args.user_id,
    role: "owner",
  });

  // Auto-seed för Filip eller om explicit valt
  const shouldSeed =
    args.use_hector_preset ||
    user?.email === "filiphector@gmail.com";

  if (shouldSeed) {
    await seedHectorFamily(hh.id, args.user_id);
  }

  revalidatePath("/", "layout");
  return hh;
}

export async function seedHectorFamily(householdId: string, ownerUserId: string) {
  const supabase = await createClient();

  // Hushållsprofil
  await supabase.from("sondag_household_profile").upsert({
    household_id: householdId,
    ...HECTOR_HOUSEHOLD_PROFILE,
  });

  // Familjemedlemmar — Filip länkas till auth-user, övriga är profilrader utan login
  for (const member of HECTOR_FAMILY_MEMBERS) {
    await supabase.from("sondag_family_members").insert({
      household_id: householdId,
      user_id: member.name === "Filip" ? ownerUserId : null,
      ...member,
    });
  }

  // Always-have items (skafferi-baseline)
  await supabase.from("sondag_always_have_items").upsert(
    HECTOR_ALWAYS_HAVE.map((item) => ({
      household_id: householdId,
      name_normalized: item.display_name
        .toLowerCase()
        .replace(/[åä]/g, "a")
        .replace(/ö/g, "o")
        .trim(),
      display_name: item.display_name,
      category: item.category,
    })),
    { onConflict: "household_id,name_normalized" }
  );
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
  await supabase.from("sondag_diet_preferences").upsert(args);
  revalidatePath("/installningar");
}

export async function upsertFamilyMemberAction(args: {
  id?: string;
  household_id: string;
  user_id?: string | null;
  name: string;
  role: "vuxen" | "barn" | "tonåring";
  age?: number | null;
  avatar_color?: string;
  eats_red_meat?: boolean;
  eats_fish?: boolean;
  eats_chicken?: boolean;
  eats_pork?: boolean;
  vegetarian?: boolean;
  vegan?: boolean;
  allergies?: string[];
  loves?: string[];
  dislikes?: string[];
  always_eats?: string[];
  food_strategy?: string | null;
  notes?: string | null;
}) {
  const supabase = await createClient();
  if (args.id) {
    await supabase.from("sondag_family_members").update(args).eq("id", args.id);
  } else {
    await supabase.from("sondag_family_members").insert(args);
  }
  revalidatePath("/familj");
  revalidatePath("/installningar");
}

export async function deleteFamilyMemberAction(id: string) {
  const supabase = await createClient();
  await supabase.from("sondag_family_members").delete().eq("id", id);
  revalidatePath("/familj");
}
