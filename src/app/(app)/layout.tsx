import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentHousehold, getCurrentUser } from "@/lib/supabase/server";
import { AppNav } from "@/components/app-nav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const household = await getCurrentHousehold();

  return (
    <div className="min-h-dvh">
      <header className="border-b border-espresso/15 bg-cream/80 backdrop-blur sticky top-0 z-50">
        <div className="mx-auto max-w-6xl px-6 md:px-10 py-4 flex items-center justify-between">
          <Link href="/vecka" className="font-display text-xl">Söndag</Link>
          <AppNav />
          <div className="text-xs text-ink-soft hidden md:block">
            {household?.households && "name" in household.households
              ? (household.households as { name: string }).name
              : "Inget hushåll"}
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 md:px-10 py-10">{children}</main>
    </div>
  );
}
