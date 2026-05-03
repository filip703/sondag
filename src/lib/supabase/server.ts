import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      db: { schema: "sondag" },
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // setAll i Server Component — kan ignoreras om middleware refreshar sessions
          }
        },
      },
    }
  );
}

export async function getCurrentUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function getCurrentHousehold() {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) return null;
  const { data } = await supabase
    .from("household_members")
    .select("household_id, households(id, name)")
    .eq("user_id", user.id)
    .limit(1)
    .single();
  return data;
}
