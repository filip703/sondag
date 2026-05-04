"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import {
  Search,
  X,
  ChefHat,
  Wine,
  Package,
  ShoppingCart,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { SearchHit } from "@/app/api/search/route";

const TYPE_META: Record<SearchHit["type"], { Icon: typeof Search; color: string; label: string }> = {
  recipe: { Icon: ChefHat, color: "text-rust", label: "Recept" },
  drink: { Icon: Wine, color: "text-petrol", label: "Drink" },
  pantry: { Icon: Package, color: "text-camel", label: "Skafferi" },
  shopping: { Icon: ShoppingCart, color: "text-olive", label: "Inköp" },
  skap: { Icon: Sparkles, color: "text-burgundy", label: "Skåp" },
};

export function SearchButton() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // Cmd+K / Ctrl+K
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(true);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="icon-btn icon-btn-rust"
        aria-label="Sök"
        title="Sök (cmd+K)"
      >
        <Search size={18} />
      </button>
      {open && mounted && createPortal(
        <SearchModal onClose={() => setOpen(false)} />,
        document.body
      )}
    </>
  );
}

function SearchModal({ onClose }: { onClose: () => void }) {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    inputRef.current?.focus();
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  // Debounced search
  useEffect(() => {
    if (q.trim().length < 2) {
      setHits([]);
      return;
    }
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
        if (res.ok) {
          const j = (await res.json()) as { hits: SearchHit[] };
          setHits(j.hits ?? []);
          setHighlighted(0);
        }
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [q]);

  const goToHit = useCallback(
    (hit: SearchHit) => {
      router.push(hit.href);
      onClose();
    },
    [router, onClose]
  );

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      onClose();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlighted((h) => Math.min(h + 1, hits.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlighted((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter" && hits[highlighted]) {
      goToHit(hits[highlighted]);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center p-4 pt-[10vh] bg-espresso/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-cream-light border border-espresso/15 rounded-sm shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-espresso/15">
          <Search size={18} className="text-ink-soft shrink-0" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Sök recept, drinkar, hemma, listan, skåp..."
            className="flex-1 bg-transparent text-base focus:outline-none"
          />
          <button onClick={onClose} className="icon-btn" aria-label="Stäng">
            <X size={16} />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto">
          {q.trim().length < 2 && (
            <div className="px-4 py-12 text-center text-sm text-ink-soft">
              Skriv minst 2 tecken för att söka. Cmd+K öppnar sök från valfri sida.
            </div>
          )}
          {q.trim().length >= 2 && loading && (
            <div className="px-4 py-12 text-center text-sm text-ink-soft italic">
              Söker...
            </div>
          )}
          {q.trim().length >= 2 && !loading && hits.length === 0 && (
            <div className="px-4 py-12 text-center text-sm text-ink-soft">
              Inga träffar för &quot;{q}&quot;.
            </div>
          )}
          <ul>
            {hits.map((hit, i) => {
              const meta = TYPE_META[hit.type];
              const Icon = meta.Icon;
              return (
                <li key={`${hit.type}-${hit.id}`}>
                  <button
                    onClick={() => goToHit(hit)}
                    onMouseEnter={() => setHighlighted(i)}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-3 text-left transition border-l-2",
                      highlighted === i
                        ? "bg-cream-accent border-rust"
                        : "border-transparent hover:bg-cream-accent/40"
                    )}
                  >
                    <Icon size={16} className={cn("shrink-0", meta.color)} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium leading-tight truncate">
                        {hit.title}
                      </p>
                      <p className="text-xs text-ink-soft mt-0.5">
                        <span className="text-rust">{meta.label}</span>
                        {hit.subtitle && ` · ${hit.subtitle}`}
                        {hit.meta && ` · ${hit.meta}`}
                      </p>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        {hits.length > 0 && (
          <div className="px-4 py-2 border-t border-espresso/10 text-[10px] text-ink-soft tracking-[0.18em] uppercase flex justify-between">
            <span>↑↓ navigera · ⏎ öppna</span>
            <span>esc stäng</span>
          </div>
        )}
      </div>
    </div>
  );
}
