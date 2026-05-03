import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { HOUSEHOLD_ID } from "@/lib/auth-pin";
import { logActivity } from "@/lib/activity";
import { normalizeName } from "@/lib/utils";

export const runtime = "nodejs";

interface Body {
  ean: string;
  target?: "pantry" | "always_have";
}

interface OffProduct {
  product_name?: string;
  product_name_sv?: string;
  product_name_en?: string;
  brands?: string;
  quantity?: string;
  categories?: string;
}

const CATEGORY_MAP: { match: RegExp; cat: string }[] = [
  { match: /(meat|kyckling|nötkött|kött|fläsk|chicken|beef)/i, cat: "kött" },
  { match: /(fish|lax|sill|fisk|salmon|seafood)/i, cat: "fisk" },
  { match: /(milk|mejeri|cheese|ost|grädde|crème|yoghurt)/i, cat: "mejeri" },
  { match: /(bröd|bread|tortilla|hamburger)/i, cat: "bröd" },
  { match: /(frukt|grön|fruit|vegetable|grönsak)/i, cat: "frukt-grönt" },
  { match: /(frys|frozen)/i, cat: "frys" },
  { match: /(snack|chip|godis|choklad|nut)/i, cat: "snacks" },
  { match: /(drink|läsk|saft|juice|tonic|öl|vin|sprit)/i, cat: "dryck" },
  { match: /(krydd|salt|peppar|sauce|spice)/i, cat: "kryddor" },
];

function inferCategory(text: string): string {
  for (const m of CATEGORY_MAP) if (m.match.test(text)) return m.cat;
  return "skafferi";
}

export async function POST(req: Request) {
  const body = (await req.json()) as Body;
  if (!body.ean?.match(/^\d{8,14}$/)) {
    return NextResponse.json({ error: "Ogiltig EAN-kod" }, { status: 400 });
  }

  // Slå upp i Open Food Facts
  let product: OffProduct = {};
  try {
    const r = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${body.ean}.json`,
      { signal: AbortSignal.timeout(8000), headers: { "User-Agent": "Sondag/0.1 (Filip Hector)" } }
    );
    if (r.ok) {
      const json = await r.json();
      if (json.status === 1 && json.product) product = json.product;
    }
  } catch {
    // Ignorera, låt namn vara fallback
  }

  const name = product.product_name_sv || product.product_name || product.product_name_en || `EAN ${body.ean}`;
  const category = inferCategory(`${product.categories ?? ""} ${name}`);

  const supabase = await createClient();
  const target = body.target ?? "pantry";

  if (target === "always_have") {
    await supabase.from("sondag_always_have_items").upsert(
      {
        household_id: HOUSEHOLD_ID,
        name_normalized: normalizeName(name),
        display_name: name,
        category,
        ica_ean: body.ean,
      },
      { onConflict: "household_id,name_normalized" }
    );
  } else {
    await supabase.from("sondag_pantry_items").insert({
      household_id: HOUSEHOLD_ID,
      name,
      category,
      ica_ean: body.ean,
      quantity: 1,
      unit: "st",
    });
  }

  await logActivity({
    verb: target === "always_have" ? "remembered_always_have" : "added_pantry",
    object_type: target === "always_have" ? "always_have_item" : "pantry_item",
    object_name: name,
    payload: { ean: body.ean, scanned: true },
  });

  return NextResponse.json({ ok: true, product: { name, category, ean: body.ean, brand: product.brands ?? null } });
}
