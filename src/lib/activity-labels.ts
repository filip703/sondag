// Client-safe — inga server-imports
export type ActivityVerb =
  | "added_pantry"
  | "removed_pantry"
  | "generated_menu"
  | "regenerated_menu"
  | "marked_takeaway"
  | "cleared_takeaway"
  | "marked_have_at_home"
  | "remembered_always_have"
  | "removed_always_have"
  | "checked_off"
  | "unchecked"
  | "added_shopping_item"
  | "removed_shopping_item"
  | "synced_to_ica"
  | "edited_member"
  | "added_member"
  | "removed_member";

const VERB_LABEL: Record<ActivityVerb, string> = {
  added_pantry: "lade till i skafferiet",
  removed_pantry: "tog bort från skafferiet",
  generated_menu: "genererade veckomenyn",
  regenerated_menu: "regenererade veckomenyn",
  marked_takeaway: "markerade som takeaway",
  cleared_takeaway: "ångrade takeaway",
  marked_have_at_home: "markerade som hemma",
  remembered_always_have: "kom-ihåg-listade",
  removed_always_have: "tog bort från alltid-hemma",
  checked_off: "kryssade av",
  unchecked: "ångrade kryssning",
  added_shopping_item: "lade till på inköpslistan",
  removed_shopping_item: "tog bort från inköpslistan",
  synced_to_ica: "synkade till ICA",
  edited_member: "uppdaterade",
  added_member: "lade till",
  removed_member: "tog bort",
};

export function describeActivity(verb: ActivityVerb, objectName?: string | null): string {
  const v = VERB_LABEL[verb] ?? verb;
  return objectName ? `${v} "${objectName}"` : v;
}
