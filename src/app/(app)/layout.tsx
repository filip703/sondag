import Link from "next/link";
import { AppNav } from "@/components/app-nav";
import { ActiveActor } from "@/components/active-actor";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh">
      <header className="border-b border-espresso/15 bg-cream/80 backdrop-blur sticky top-0 z-30">
        <div className="mx-auto max-w-6xl px-6 md:px-10 py-4 flex items-center justify-between gap-4">
          <Link href="/vecka" className="font-display text-xl">Söndag</Link>
          <ActiveActor />
          <AppNav />
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 md:px-10 py-10">{children}</main>
    </div>
  );
}
