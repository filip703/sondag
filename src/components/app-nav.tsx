"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const items = [
  { href: "/vecka", label: "Vecka" },
  { href: "/skafferi", label: "Skafferi" },
  { href: "/inkop", label: "Inköp" },
  { href: "/bar", label: "Baren" },
  { href: "/familj", label: "Familjen" },
  { href: "/aktivitet", label: "Aktivitet" },
];

export function AppNav() {
  const pathname = usePathname();
  return (
    <nav className="flex items-center gap-6 text-sm">
      {items.map((it) => {
        const active = pathname?.startsWith(it.href);
        return (
          <Link
            key={it.href}
            href={it.href}
            className={cn(
              "transition relative py-1",
              active ? "text-espresso" : "text-ink-soft hover:text-espresso"
            )}
          >
            {it.label}
            {active && (
              <span className="absolute -bottom-[17px] left-0 right-0 h-px bg-rust" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
