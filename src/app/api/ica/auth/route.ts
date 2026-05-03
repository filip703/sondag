import { NextResponse } from "next/server";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { IcaClient } from "@/lib/ica/client";
import { IcaApiError } from "@/lib/ica/types";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { household_id, username, password, default_store_id, default_store_name } =
    await req.json();

  if (!household_id || !username) {
    return NextResponse.json({ error: "household_id och username krävs" }, { status: 400 });
  }

  const supabase = await createClient();

  // Verifiera att användaren tillhör hushållet
  const { data: member } = await supabase
    .from("sondag_household_members")
    .select("household_id")
    .eq("household_id", household_id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!member) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Om password är tomt, behåll befintlig session
  if (!password) {
    await supabase
      .from("sondag_ica_connections")
      .update({
        default_store_id,
        default_store_name,
      })
      .eq("household_id", household_id);
    return NextResponse.json({ ok: true });
  }

  // Logga in mot ICA
  let auth;
  try {
    auth = await IcaClient.login(username, password);
  } catch (e) {
    if (e instanceof IcaApiError) {
      return NextResponse.json(
        { error: `ICA: ${e.message}` },
        { status: e.status === 401 ? 401 : 502 }
      );
    }
    throw e;
  }

  // Spara token. OBS: i prod ska detta krypteras via Supabase Vault
  // För nu sparas det som plaintext i en RLS-skyddad tabell.
  await supabase.from("sondag_ica_connections").upsert(
    {
      household_id,
      ica_username: username,
      ica_session_token: auth.accessToken,
      ica_refresh_token: auth.refreshToken,
      token_expires_at: auth.expiresAt.toISOString(),
      default_store_id,
      default_store_name,
    },
    { onConflict: "household_id" }
  );

  return NextResponse.json({ ok: true });
}
