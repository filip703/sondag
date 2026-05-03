// Enkel PIN-baserad gate. Single-tenant — Filip-hushållet seedat med fast UUID.
// När du vill gå publikt, byt till Supabase Auth + RLS igen.

import { cookies } from "next/headers";

export const PIN_COOKIE = "sondag_pin_ok";
export const ACTOR_COOKIE = "sondag_actor";
export const HOUSEHOLD_ID =
  process.env.SONDAG_HOUSEHOLD_ID ?? "f1117ec7-0000-0000-0000-fa31119ec704";

export function getRequiredPin(): string {
  return process.env.SONDAG_PIN ?? "1337";
}

export async function isPinValid(): Promise<boolean> {
  const c = await cookies();
  return c.get(PIN_COOKIE)?.value === "1";
}

export interface ActiveActor {
  id: string;
  name: string;
}

export async function getActiveActor(): Promise<ActiveActor | null> {
  const c = await cookies();
  const raw = c.get(ACTOR_COOKIE)?.value;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(decodeURIComponent(raw));
    if (parsed?.id && parsed?.name) return parsed;
  } catch {
    return null;
  }
  return null;
}
