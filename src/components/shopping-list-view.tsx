"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Home, Pin, ShoppingCart, RefreshCw, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  toggleHaveAtHomeAction,
  toggleCheckedAction,
  rememberAlwaysHaveItemAction,
  addShoppingItemAction,
  removeShoppingItemAction,
} from "@/app/actions/shopping-list";

interface Item {
  id: string;
  name: string;
  quantity: number | null;
  unit: string | null;
  category: string | null;
  ica_ean: string | null;
  have_at_home: boolean;
  checked: boolean;
  remember_have_at_home: boolean;
  notes: string | null;
}

interface List {
  id: string;
  name: string;
  status: string;
  ica_list_id: string | null;
  synced_at: string | null;
}

interface IcaConn {
  ica_username: string | null;
  default_store_name: string | null;
  last_synced_at: string | null;
}

export function ShoppingListView({
  list,
  items,
  householdId,
  ica,
}: {
  list: List;
  items: Item[];
  householdId: string;
  ica: IcaConn | null;
}) {
  const [isPending, startTransition] = useTransition();
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [newItem, setNewItem] = useState("");
  const router = useRouter();

  function toggleHave(item: Item) {
    startTransition(async () => {
      await toggleHaveAtHomeAction(item.id, !item.have_at_home);
      router.refresh();
    });
  }

  function toggleChecked(item: Item) {
    startTransition(async () => {
      await toggleCheckedAction(item.id, !item.checked);
      router.refresh();
    });
  }

  function remember(item: Item) {
    startTransition(async () => {
      await rememberAlwaysHaveItemAction(item.id, !item.remember_have_at_home);
      router.refresh();
    });
  }

  function addItem() {
    if (!newItem.trim()) return;
    startTransition(async () => {
      await addShoppingItemAction({
        list_id: list.id,
        name: newItem.trim(),
      });
      setNewItem("");
      router.refresh();
    });
  }

  function remove(id: string) {
    startTransition(async () => {
      await removeShoppingItemAction(id);
      router.refresh();
    });
  }

  async function syncToIca() {
    setIsSyncing(true);
    setSyncError(null);
    try {
      const res = await fetch("/api/ica/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ list_id: list.id }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setSyncError(j.error || "ICA-sync misslyckades");
      } else {
        router.refresh();
      }
    } finally {
      setIsSyncing(false);
    }
  }

  // Filtrera bort items som är "alltid hemma" (visa men dimma)
  const visible = items.filter((i) => !i.have_at_home);
  const hidden = items.filter((i) => i.have_at_home);
  const grouped = visible.reduce<Record<string, Item[]>>((acc, it) => {
    const key = it.category || "Övrigt";
    (acc[key] ||= []).push(it);
    return acc;
  }, {});

  return (
    <div className="grid md:grid-cols-3 gap-10">
      <div className="md:col-span-2">
        <div className="card p-5 mb-6">
          <div className="flex gap-2">
            <input
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addItem()}
              placeholder="Lägg till — t.ex. Mjölk 1.5L"
              className="flex-1 bg-transparent border-b border-espresso/30 px-1 py-2 focus:outline-none focus:border-espresso"
            />
            <button
              onClick={addItem}
              disabled={!newItem.trim()}
              className="btn btn-primary"
            >
              <Plus size={14} />
            </button>
          </div>
        </div>

        {visible.length === 0 && (
          <p className="text-sm text-ink-soft italic">
            Listan är tom. Generera veckomeny först eller lägg till manuellt ovan.
          </p>
        )}

        {Object.entries(grouped).map(([cat, list]) => (
          <div key={cat} className="mb-6">
            <div className="divider mb-2">
              <p className="eyebrow">{cat}</p>
            </div>
            <ul>
              {list.map((item) => (
                <li
                  key={item.id}
                  className={cn(
                    "flex items-center gap-3 py-2.5 border-b border-espresso/10 group",
                    item.checked && "opacity-50"
                  )}
                >
                  <button
                    onClick={() => toggleChecked(item)}
                    className={cn(
                      "w-5 h-5 border rounded-sm flex items-center justify-center transition shrink-0",
                      item.checked
                        ? "bg-espresso border-espresso text-cream"
                        : "border-espresso/40 hover:border-espresso"
                    )}
                  >
                    {item.checked && <Check size={12} />}
                  </button>
                  <span className={cn("flex-1 text-sm", item.checked && "line-through")}>
                    {item.name}
                    {(item.quantity || item.unit) && (
                      <span className="text-xs text-ink-soft ml-2 tabular-nums">
                        {item.quantity}{item.unit && ` ${item.unit}`}
                      </span>
                    )}
                  </span>
                  <button
                    onClick={() => toggleHave(item)}
                    title="Vi har det hemma"
                    className="opacity-0 group-hover:opacity-100 text-ink-soft hover:text-rust transition"
                  >
                    <Home size={14} />
                  </button>
                  <button
                    onClick={() => remember(item)}
                    title="Kom ihåg att vi alltid har det här"
                    className={cn(
                      "transition",
                      item.remember_have_at_home
                        ? "text-rust opacity-100"
                        : "text-ink-soft opacity-0 group-hover:opacity-100 hover:text-rust"
                    )}
                  >
                    <Pin size={14} />
                  </button>
                  <button
                    onClick={() => remove(item.id)}
                    className="opacity-0 group-hover:opacity-100 text-ink-soft hover:text-burgundy transition"
                  >
                    <Trash2 size={14} />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}

        {hidden.length > 0 && (
          <details className="mt-8">
            <summary className="eyebrow cursor-pointer hover:text-rust">
              Vi har redan hemma ({hidden.length})
            </summary>
            <ul className="mt-3 opacity-50">
              {hidden.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center gap-3 py-2 border-b border-espresso/10 text-sm"
                >
                  <button
                    onClick={() => toggleHave(item)}
                    className="w-5 h-5 border border-rust rounded-sm flex items-center justify-center text-rust shrink-0"
                  >
                    <Home size={11} />
                  </button>
                  <span className="line-through">{item.name}</span>
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>

      <aside>
        <div className="card p-5">
          <p className="eyebrow mb-3">ICA-sync</p>
          {ica?.ica_username ? (
            <>
              <p className="text-sm">{ica.ica_username}</p>
              <p className="text-xs text-ink-soft mt-1">
                {ica.default_store_name || "Ingen butik vald"}
              </p>
              {ica.last_synced_at && (
                <p className="text-xs text-ink-soft mt-3">
                  Senast synkad{" "}
                  {new Date(ica.last_synced_at).toLocaleString("sv-SE", {
                    dateStyle: "short",
                    timeStyle: "short",
                  })}
                </p>
              )}
              <button
                onClick={syncToIca}
                disabled={isSyncing}
                className="btn btn-primary w-full justify-center mt-4"
              >
                <RefreshCw size={14} className={isSyncing ? "animate-spin" : ""} />
                {isSyncing ? "Synkar..." : "Synka till handscannern"}
              </button>
              {syncError && (
                <p className="text-xs text-burgundy mt-2">{syncError}</p>
              )}
            </>
          ) : (
            <>
              <p className="text-sm text-ink-soft mb-3">
                Koppla ditt ICA-konto för att skicka listan direkt till handscannern.
              </p>
              <a
                href="/installningar#ica"
                className="btn btn-ghost w-full justify-center"
              >
                Anslut ICA
              </a>
            </>
          )}
        </div>

        <div className="mt-6 text-xs text-ink-soft">
          <p className="mb-2">
            <Home size={11} className="inline mr-1.5" />
            Vi har det hemma — döljs från listan
          </p>
          <p>
            <Pin size={11} className="inline mr-1.5 text-rust" />
            Kom ihåg — döljs alltid framöver
          </p>
        </div>
      </aside>
    </div>
  );
}
