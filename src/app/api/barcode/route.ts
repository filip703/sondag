import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { HOUSEHOLD_ID } from "@/lib/auth-pin";
import { logActivity } from "@/lib/activity";
import { classifyStorage, type Storage } from "@/lib/storage-classify";

export const runtime = "nodejs";

interface Body {
  ean: string;
  storage?: Storage; // valfri override
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
  { match: /(milk|mejeri|cheese|ost|grädde|crème|yoghurt|mjölk|smör)/i, cat: "mejeri" },
  { match: /(bröd|bread|tortilla|hamburger|pizzabotten)/i, cat: "bröd" },
  { match: /(frukt|grön|fruit|vegetable|grönsak)/i, cat: "frukt-grönt" },
  { match: /(frys|frozen|djupfryst|glass)/i, cat: "frys" },
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
      {
        signal: AbortSignal.timeout(8000),
        headers: { "User-Agent": "Sondag/0.1 (Filip Hector)" },
      }
    );
    if (r.ok) {
      const json = await r.json();
      if (json.status === 1 && json.product) product = json.product;
    }
  } catch {
    // Ignorera
  }

  const name =
    product.product_name_sv ||
    product.product_name ||
    product.product_name_en ||
    `EAN ${body.ean}`;
  const category = inferCategory(`${product.categories ?? ""} ${name}`);
  const storage: Storage = body.storage ?? classifyStorage(category, name);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sondag_pantry_items")
    .insert({
      household_id: HOUSEHOLD_ID,
      name,
      category,
      storage,
      ica_ean: body.ean,
      quantity: 1,
      unit: "st",
    })
    .select()
    .single();

  if (error) {
    console.error("Barcode add error:", error);
    return NextResponse.json(
      { error: `Kunde inte spara: ${error.message}` },
      { status: 500 }
    );
  }

  await logActivity({
    verb: "added_pantry",
    object_type: "pantry_item",
    object_id: data?.id,
    object_name: `${name} → ${storage}`,
    payload: { ean: body.ean, scanned: true, brand: product.brands ?? null },
  });

  return NextResponse.json({
    ok: true,
    product: {
      name,
      category,
      storage,
      ean: body.ean,
      brand: product.brands ?? null,
    },
  });
}
