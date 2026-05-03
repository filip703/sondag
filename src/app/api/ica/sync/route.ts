import { NextResponse } from "next/server";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { IcaClient, toIcaRows } from "@/lib/ica/client";
import { IcaApiError } from "@/lib/ica/types";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { list_id } = await req.json();
  if (!list_id) return NextResponse.json({ error: "list_id krävs" }, { status: 400 });

  const supabase = await createClient();

  const { data: list } = await supabase
    .from("shopping_lists")
    .select("*")
    .eq("id", list_id)
    .single();
  if (!list) return NextResponse.json({ error: "Lista saknas" }, { status: 404 });

  const { data: ica } = await supabase
    .from("ica_connections")
    .select("*")
    .eq("household_id", list.household_id)
    .maybeSingle();
  if (!ica?.ica_session_token) {
    return NextResponse.json(
      { error: "ICA är inte anslutet. Gå till Inställningar → ICA." },
      { status: 400 }
    );
  }

  const { data: items } = await supabase
    .from("shopping_list_items")
    .select("id, name, quantity, unit, ica_ean, ica_article_id, checked, have_at_home")
    .eq("shopping_list_id", list_id);

  // Filtrera bort items vi har hemma
  const toSync = (items ?? []).filter((i) => !i.have_at_home);

  // Verifiera token, försök igen om den gått ut
  const valid = await IcaClient.verify(ica.ica_session_token);
  if (!valid) {
    return NextResponse.json(
      { error: "ICA-sessionen har gått ut. Logga in igen i Inställningar." },
      { status: 401 }
    );
  }

  // Använd samma OfflineId varje gång så vi uppdaterar samma lista istället för att skapa nya
  const offlineId = list.ica_list_id ?? list.id;

  try {
    const result = await IcaClient.upsertShoppingList(ica.ica_session_token, {
      OfflineId: offlineId,
      Title: list.name,
      SortingStore: ica.default_store_id ? Number(ica.default_store_id) : undefined,
      Rows: toIcaRows(toSync),
    });

    await supabase
      .from("shopping_lists")
      .update({
        status: "synced_to_ica",
        ica_list_id: result.OfflineId,
        synced_at: new Date().toISOString(),
      })
      .eq("id", list_id);

    await supabase
      .from("ica_connections")
      .update({ last_synced_at: new Date().toISOString() })
      .eq("household_id", list.household_id);

    return NextResponse.json({
      ok: true,
      synced: toSync.length,
      ica_list_id: result.OfflineId,
    });
  } catch (e) {
    if (e instanceof IcaApiError) {
      return NextResponse.json(
        { error: `ICA-sync: ${e.message}` },
        { status: 502 }
      );
    }
    throw e;
  }
}
