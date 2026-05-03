// Manuell typdefinition tills `npm run db:types` har körts
// Generera riktiga typer med: npm run db:types

export type UUID = string;

export type MealSlot = "frukost" | "lunch" | "middag" | "mellanmål" | "snacks" | "dryck";
export type ShoppingListStatus = "active" | "synced_to_ica" | "completed" | "archived";

export interface Household {
  id: UUID;
  name: string;
  created_at: string;
  created_by: UUID;
}

export interface HouseholdMember {
  household_id: UUID;
  user_id: UUID;
  role: "owner" | "member";
  display_name: string | null;
  created_at: string;
}

export interface DietPreferences {
  household_id: UUID;
  user_id: UUID;
  allergies: string[];
  dislikes: string[];
  diet_type: string | null;
  notes: string | null;
  updated_at: string;
}

export interface PantryItem {
  id: UUID;
  household_id: UUID;
  name: string;
  quantity: number | null;
  unit: string | null;
  category: string | null;
  expiry_date: string | null;
  ica_ean: string | null;
  ica_article_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Recipe {
  id: UUID;
  household_id: UUID | null;
  title: string;
  description: string | null;
  servings: number;
  prep_minutes: number | null;
  cook_minutes: number | null;
  instructions: string[];
  tags: string[];
  cuisine: string | null;
  difficulty: "lätt" | "medel" | "svår" | null;
  ai_generated: boolean;
  ai_prompt_context: Record<string, unknown> | null;
  saved: boolean;
  image_url: string | null;
  source_url: string | null;
  created_at: string;
}

export interface RecipeIngredient {
  id: UUID;
  recipe_id: UUID;
  name: string;
  quantity: number | null;
  unit: string | null;
  category: string | null;
  ica_ean: string | null;
  order_index: number;
  optional: boolean;
}

export interface MealPlan {
  id: UUID;
  household_id: UUID;
  week_start: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface MealPlanEntry {
  id: UUID;
  meal_plan_id: UUID;
  date: string;
  slot: MealSlot;
  recipe_id: UUID | null;
  custom_title: string | null;
  servings: number | null;
  takeaway: boolean;
  takeaway_type: string | null;
  takeaway_vendor: string | null;
  takeaway_cost: number | null;
  notes: string | null;
  created_at: string;
}

export interface ShoppingList {
  id: UUID;
  household_id: UUID;
  meal_plan_id: UUID | null;
  name: string;
  status: ShoppingListStatus;
  ica_list_id: string | null;
  ica_list_url: string | null;
  created_at: string;
  synced_at: string | null;
  completed_at: string | null;
}

export interface ShoppingListItem {
  id: UUID;
  shopping_list_id: UUID;
  name: string;
  quantity: number | null;
  unit: string | null;
  category: string | null;
  ica_ean: string | null;
  ica_article_id: string | null;
  have_at_home: boolean;
  checked: boolean;
  order_index: number;
  recipe_id: UUID | null;
  notes: string | null;
  remember_have_at_home: boolean;
}

export interface AlwaysHaveItem {
  id: UUID;
  household_id: UUID;
  name_normalized: string;
  display_name: string;
  category: string | null;
  ica_ean: string | null;
  notes: string | null;
  created_at: string;
}

export interface IcaConnection {
  household_id: UUID;
  ica_username: string | null;
  ica_session_token: string | null;
  ica_refresh_token: string | null;
  token_expires_at: string | null;
  last_synced_at: string | null;
  default_store_id: string | null;
  default_store_name: string | null;
  created_at: string;
  updated_at: string;
}
