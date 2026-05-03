"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Menu, X, CalendarDays, ShoppingCart, Package, Wine, Users, Activity, Settings, Home, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/vecka", label: "Vecka", desc: "Veckomeny + AI-planering", Icon: CalendarDays },
  { href: "/handla", label: "Handla", desc: "Inköpslista i butiksordning", Icon: ShoppingCart },
  { href: "/skafferi", label: "Skafferi", desc: "Vad finns hemma — skafferi/kyl/frys", Icon: Home },
  { href: "/skap", label: "Skåp", desc: "Standardprovianten + bar", Icon: Package },
  { href: "/bar", label: "Baren", desc: "Drinkar + AI-bartender", Icon: Wine },
  { href: "/familj", label: "Familjen", desc: "Per-medlem-profiler", Icon: Users },
  { href: "/aktivitet", label: "Aktivitet", desc: "Vem-gjorde-vad-historik", Icon: Activity },
  { href: "/installningar", label: "Inställningar", desc: "ICA + preferenser", Icon: Settings },
];

export function AppNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const current = items.find((it) => pathname?.startsWith(it.href));

  useEffect(() => setMounted(true), []);

  // Stäng vid navigering
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Esc + scroll-lock
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    if (open) {
      window.addEventListener("keydown", onKey);
      document.body.style.overflow = "hidden";
      return () => {
        window.removeEventListener("keydown", onKey);
        document.body.style.overflow = "";
      };
    }
  }, [open]);

  const drawer = (
    <div
      className="fixed inset-0 z-[100] flex justify-end"
      style={{
        // iOS PWA respekterar inte alltid env(safe-area-inset-*) på sticky-elements
        // → hårdkoda full viewport
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
      }}
    >
      <button
        onClick={() => setOpen(false)}
        className="absolute inset-0 bg-espresso/40 backdrop-blur-sm"
        aria-label="Stäng meny"
      />
      <nav
        className="relative h-full w-full max-w-sm bg-cream-light border-l border-espresso/15 shadow-xl flex flex-col"
        style={{
          paddingTop: "env(safe-area-inset-top)",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-espresso/15">
          <div>
            <p className="eyebrow">Meny</p>
            <p className="font-display text-2xl mt-0.5">Söndag</p>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="text-ink-soft hover:text-espresso p-2 -mr-2"
            aria-label="Stäng"
          >
            <X size={20} />
          </button>
        </div>
        <ul className="flex-1 overflow-y-auto py-2">
          {items.map(({ href, label, desc, Icon }) => {
            const active = pathname?.startsWith(href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={cn(
                    "flex items-start gap-4 px-6 py-4 hover:bg-cream-accent transition border-l-2",
                    active
                      ? "border-rust bg-cream-accent/40"
                      : "border-transparent"
                  )}
                >
                  <Icon
                    size={18}
                    className={cn(
                      "mt-0.5 shrink-0",
                      active ? "text-rust" : "text-ink-soft"
                    )}
                  />
                  <div>
                    <p className={cn("font-medium", active && "text-rust")}>
                      {label}
                    </p>
                    <p className="text-xs text-ink-soft mt-0.5">{desc}</p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
        <div className="px-6 py-4 border-t border-espresso/15 text-xs text-ink-soft">
          <p className="flex items-center gap-2">
            <Sparkles size={11} className="text-rust" />
            Söndag — by Filip Hector
          </p>
        </div>
      </nav>
    </div>
  );

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-3 py-2 -mx-3 hover:bg-cream-accent rounded-sm transition"
        aria-label="Öppna meny"
      >
        <Menu size={18} />
        {current && (
          <span className="text-sm hidden sm:inline">{current.label}</span>
        )}
      </button>
      {open && mounted && createPortal(drawer, document.body)}
    </>
  );
}
