import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { HOUSEHOLD_ID } from "@/lib/auth-pin";

export const runtime = "nodejs";

export interface SearchHit {
  type: "recipe" | "drink" | "pantry" | "shopping" | "skap";
  id: string;
  title: string;
  subtitle?: string;
  href: string;
  meta?: string;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim();
  if (!q || q.length < 2) {
    return NextResponse.json({ hits: [] });
  }

  const supabase = await createClient();
  const pattern = `%${q}%`;

  const [recipes, drinks, pantry, shopping, skap] = await Promise.all([
    supabase
      .from("sondag_recipes")
      .select("id, title, cuisine, rating, image_url")
      .eq("household_id", HOUSEHOLD_ID)
      .ilike("title", pattern)
      .order("rating", { ascending: false, nullsFirst: false })
      .limit(8),
    supabase
      .from("sondag_drinks")
      .select("id, name, base_spirit, signature")
      .eq("household_id", HOUSEHOLD_ID)
      .ilike("name", pattern)
      .order("signature", { ascending: false })
      .limit(5),
    supabase
      .from("sondag_pantry_items")
      .select("id, name, storage, quantity, unit")
      .eq("household_id", HOUSEHOLD_ID)
      .ilike("name", pattern)
      .limit(5),
    supabase
      .from("sondag_shopping_list_items")
      .select("id, name, quantity, unit")
      .ilike("name", pattern)
      .limit(5),
    supabase
      .from("sondag_standard_pantry_items")
      .select("id, name, subcategory, is_bar")
      .eq("household_id", HOUSEHOLD_ID)
      .ilike("name", pattern)
      .limit(5),
  ]);

  const hits: SearchHit[] = [];

  for (const r of recipes.data ?? []) {
    hits.push({
      type: "recipe",
      id: r.id,
      title: r.title,
      subtitle: r.cuisine ?? undefined,
      href: "/vecka",
      meta: r.rating ? "★".repeat(r.rating) : undefined,
    });
  }
  for (const d of drinks.data ?? []) {
    hits.push({
      type: "drink",
      id: d.id,
      title: d.name,
      subtitle: d.base_spirit ?? undefined,
      href: "/bar",
      meta: d.signature ? "Signature" : undefined,
    });
  }
  for (const p of pantry.data ?? []) {
    hits.push({
      type: "pantry",
      id: p.id,
      title: p.name,
      subtitle: p.storage ?? undefined,
      href: "/skafferi",
      meta: p.quantity ? `${p.quantity}${p.unit ? ` ${p.unit}` : ""}` : undefined,
    });
  }
  for (const s of shopping.data ?? []) {
    hits.push({
      type: "shopping",
      id: s.id,
      title: s.name,
      subtitle: "Inköpslistan",
      href: "/handla",
      meta: s.quantity ? `${s.quantity}${s.unit ? ` ${s.unit}` : ""}` : undefined,
    });
  }
  for (const k of skap.data ?? []) {
    hits.push({
      type: "skap",
      id: k.id,
      title: k.name,
      subtitle: k.is_bar ? `Bar — ${k.subcategory ?? "övrigt"}` : "Skåp",
      href: "/skap",
    });
  }

  return NextResponse.json({ hits });
}
