"use client";

import { useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, RefreshCw, ShoppingCart, Store, Trash2, Home } from "lucide-react";
import { cn } from "@/lib/utils";
import { aisleOrder, aisleLabel } from "@/lib/store-layout";
import {
  toggleCheckedAction,
  removeShoppingItemAction,
  moveToHomeAction,
} from "@/app/actions/shopping-list";

interface Item {
  id: string;
  name: string;
  quantity: number | null;
  unit: string | null;
  category: string | null;
  have_at_home: boolean;
  checked: boolean;
  notes: string | null;
}

interface List {
  id: string;
  name: string;
  status: string;
  ica_list_id: string | null;
  synced_at: string | null;
}

export function HandlaView({
  list,
  items,
  storeName,
  lastSynced,
}: {
  list: List;
  items: Item[];
  storeName: string;
  lastSynced: string | null;
}) {
  const [isPending, startTransition] = useTransition();
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const router = useRouter();

  // Filtrera bort have_at_home, gruppera per gångordning
  const visible = useMemo(
    () =>
      items
        .filter((i) => !i.have_at_home)
        .sort((a, b) => {
          const ao = aisleOrder(a.category) - aisleOrder(b.category);
          return ao !== 0 ? ao : a.name.localeCompare(b.name, "sv");
        }),
    [items]
  );

  const grouped = useMemo(() => {
    const out: Record<string, Item[]> = {};
    for (const it of visible) {
      const key = it.category ?? "övrigt";
      (out[key] ||= []).push(it);
    }
    return out;
  }, [visible]);

  const total = visible.length;
  const done = visible.filter((i) => i.checked).length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  function toggle(item: Item) {
    startTransition(async () => {
      await toggleCheckedAction(item.id, !item.checked);
      router.refresh();
    });
  }

  function remove(item: Item) {
    startTransition(async () => {
      await removeShoppingItemAction(item.id);
      router.refresh();
    });
  }

  function moveToHome(item: Item) {
    startTransition(async () => {
      await moveToHomeAction(item.id);
      router.refresh();
    });
  }

  async function copyToClipboard() {
    const text = Object.entries(grouped)
      .map(([cat, list]) => {
        const head = `# ${aisleLabel(cat)}`;
        const lines = list
          .filter((i) => !i.checked)
          .map((i) => {
            const qty = i.quantity ? `${i.quantity}${i.unit ? ` ${i.unit}` : ""}` : "";
            return qty ? `- ${i.name}, ${qty}` : `- ${i.name}`;
          });
        return [head, ...lines].join("\n");
      })
      .join("\n\n");

    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  async function syncToIca() {
    setIsSyncing(true);
    setSyncMsg(null);
    try {
      const res = await fetch("/api/ica/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ list_id: list.id }),
      });
      const j = await res.json().catch(() => ({}));
      setSyncMsg(res.ok ? `Synkad — ${j.synced ?? "?"} items` : j.error ?? "Sync misslyckades");
      if (res.ok) router.refresh();
    } finally {
      setIsSyncing(false);
    }
  }

  return (
    <div className="-mx-6 -my-10 md:mx-0 md:my-0">
      {/* Header */}
      <div className="sticky top-[57px] z-40 bg-cream border-b border-espresso/15 px-6 py-4 md:rounded-sm md:border md:relative md:top-0">
        <div className="flex items-center justify-between mb-2">
          <div>
            <p className="eyebrow flex items-center gap-2">
              <Store size={11} />
              {storeName}
            </p>
            <h1 className="font-display text-3xl md:text-4xl mt-1">
              Handla
            </h1>
          </div>
          <div className="text-right">
            <p className="text-2xl font-display tabular-nums">
              {done} <span className="text-ink-soft">/</span> {total}
            </p>
            <p className="eyebrow">{pct}% klart</p>
          </div>
        </div>
        <div className="bg-cream-accent rounded-sm h-1.5 overflow-hidden">
          <div
            className="bg-rust h-full transition-all"
            style={{ width: `${Math.max(pct, 2)}%` }}
          />
        </div>
        <div className="flex gap-2 mt-3">
          <button
            onClick={copyToClipboard}
            className="btn btn-ghost flex-1 justify-center text-xs"
          >
            <Copy size={12} />
            {copied ? "Kopierat!" : "Kopiera till ICA Handla"}
          </button>
          <button
            onClick={syncToIca}
            disabled={isSyncing}
            className="btn btn-primary flex-1 justify-center text-xs"
          >
            <RefreshCw size={12} className={isSyncing ? "animate-spin" : ""} />
            {isSyncing ? "Synkar..." : "Synka"}
          </button>
        </div>
        {syncMsg && <p className="text-xs text-ink-soft mt-2">{syncMsg}</p>}
        {lastSynced && (
          <p className="text-[10px] text-ink-soft mt-1">
            Senast synkad {new Date(lastSynced).toLocaleString("sv-SE", { dateStyle: "short", timeStyle: "short" })}
          </p>
        )}
      </div>

      {/* Listan */}
      <div className="px-6 py-6 md:p-0 md:mt-8">
        {total === 0 && (
          <div className="text-center py-20">
            <ShoppingCart size={32} className="mx-auto text-ink-soft mb-4" />
            <p className="text-sm text-ink-soft">
              Inget att handla just nu. Generera en veckomeny först.
            </p>
          </div>
        )}

        {Object.entries(grouped).map(([cat, list]) => {
          const catTotal = list.length;
          const catDone = list.filter((i) => i.checked).length;
          const allDone = catTotal > 0 && catDone === catTotal;
          return (
            <section key={cat} className={cn("mb-8", allDone && "opacity-50")}>
              <div className="flex items-center justify-between mb-2">
                <h2 className="font-display text-xl">{aisleLabel(cat)}</h2>
                <span className="text-xs text-ink-soft tabular-nums">
                  {catDone}/{catTotal}
                </span>
              </div>
              <div className="border-t border-espresso/15">
                {list.map((item) => (
                  <div
                    key={item.id}
                    className={cn(
                      "w-full flex items-center gap-3 py-3 border-b border-espresso/10 transition group",
                      item.checked && "bg-cream-light/50"
                    )}
                  >
                    <button
                      onClick={() => toggle(item)}
                      disabled={isPending}
                      className="flex items-center gap-4 flex-1 text-left active:bg-cream-accent -my-1 py-1 px-2 -ml-2 rounded-sm"
                    >
                      <span
                        className={cn(
                          "w-7 h-7 border rounded-sm flex items-center justify-center transition shrink-0",
                          item.checked
                            ? "bg-espresso border-espresso text-cream"
                            : "border-espresso/40"
                        )}
                      >
                        {item.checked && <Check size={16} strokeWidth={3} />}
                      </span>
                      <div className="flex-1">
                        <p
                          className={cn(
                            "text-base font-medium leading-tight",
                            item.checked && "line-through text-ink-soft"
                          )}
                        >
                          {item.name}
                        </p>
                        {(item.quantity || item.unit) && (
                          <p className="text-sm text-ink-soft tabular-nums mt-0.5">
                            {item.quantity}
                            {item.unit && ` ${item.unit}`}
                          </p>
                        )}
                      </div>
                    </button>
                    <button
                      onClick={() => moveToHome(item)}
                      disabled={isPending}
                      title="Finns redan hemma → flytta till skafferi/kyl/frys"
                      className="p-2 text-ink-soft hover:text-petrol active:bg-cream-accent rounded-sm shrink-0"
                    >
                      <Home size={16} />
                    </button>
                    <button
                      onClick={() => remove(item)}
                      disabled={isPending}
                      title="Ta bort"
                      className="p-2 text-ink-soft hover:text-burgundy active:bg-cream-accent rounded-sm shrink-0"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
