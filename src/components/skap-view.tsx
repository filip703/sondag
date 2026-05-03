"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Plus, Copy, ShoppingCart, Wine, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  toggleRefillAction,
  addStandardItemAction,
  removeStandardItemAction,
  exportRefillToShoppingAction,
} from "@/app/actions/skap";

interface Item {
  id: string;
  name: string;
  category: string | null;
  subcategory: string | null;
  is_bar: boolean;
  needs_refill: boolean;
  notes: string | null;
}

const SUBCAT_ORDER: Record<string, number> = {
  spirit: 1,
  vermouth: 2,
  likör: 3,
  bitters: 4,
  sirap: 5,
  mixer: 6,
  färskvara: 7,
  garnish: 8,
  is: 9,
};

const SUBCAT_LABEL: Record<string, string> = {
  spirit: "Sprit",
  vermouth: "Vermouth & aperitif",
  likör: "Likörer",
  bitters: "Bitters",
  sirap: "Sirap & honung",
  mixer: "Mixers",
  färskvara: "Färskvaror",
  garnish: "Garnish",
  is: "Is",
};

export function SkapView({ items: initial }: { items: Item[] }) {
  const router = useRouter();
  const [items, setItems] = useState(initial);
  const [newName, setNewName] = useState("");
  const [isPending, startTransition] = useTransition();
  const [exportMsg, setExportMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const bar = useMemo(() => items.filter((i) => i.is_bar), [items]);
  const other = useMemo(() => items.filter((i) => !i.is_bar), [items]);

  const refillCount = items.filter((i) => i.needs_refill).length;

  function toggle(item: Item) {
    setItems((curr) => curr.map((i) => (i.id === item.id ? { ...i, needs_refill: !i.needs_refill } : i)));
    startTransition(async () => {
      await toggleRefillAction(item.id, !item.needs_refill);
    });
  }

  function add(isBar: boolean) {
    if (!newName.trim()) return;
    startTransition(async () => {
      await addStandardItemAction({ name: newName.trim(), is_bar: isBar });
      setNewName("");
      router.refresh();
    });
  }

  function remove(item: Item) {
    setItems((curr) => curr.filter((i) => i.id !== item.id));
    startTransition(async () => {
      await removeStandardItemAction(item.id);
    });
  }

  async function exportToShopping() {
    setExportMsg(null);
    startTransition(async () => {
      const count = await exportRefillToShoppingAction();
      setExportMsg(`${count} items lagda på Veckohandlingen`);
      router.refresh();
    });
  }

  async function copyToClipboard() {
    const lines = items
      .filter((i) => i.needs_refill)
      .map((i) => `- ${i.name}`)
      .join("\n");
    if (!lines) return;
    await navigator.clipboard.writeText(`Skåp-handling\n\n${lines}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  function renderGroup(title: string, list: Item[], isBar: boolean) {
    // Gruppera per subcategory om bar, annars per category
    const grouped = list.reduce<Record<string, Item[]>>((acc, it) => {
      const key = (isBar ? it.subcategory : it.category) ?? "övrigt";
      (acc[key] ||= []).push(it);
      return acc;
    }, {});

    const sortedKeys = Object.keys(grouped).sort((a, b) => {
      if (isBar) return (SUBCAT_ORDER[a] ?? 99) - (SUBCAT_ORDER[b] ?? 99);
      return a.localeCompare(b);
    });

    return (
      <section className="mb-12">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display text-2xl flex items-center gap-2">
            {isBar && <Wine size={18} className="text-rust" />}
            {title}
          </h2>
          <span className="text-xs text-ink-soft">{list.length} items</span>
        </div>

        {sortedKeys.map((key) => (
          <div key={key} className="mb-6">
            <p className="eyebrow mb-2">
              {isBar ? SUBCAT_LABEL[key] ?? key : key}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
              {grouped[key].map((item) => (
                <div
                  key={item.id}
                  className={cn(
                    "flex items-center justify-between py-2 border-b border-espresso/10 group",
                    item.needs_refill && "bg-cream-light/50 -mx-2 px-2"
                  )}
                >
                  <button
                    onClick={() => toggle(item)}
                    disabled={isPending}
                    className="flex items-center gap-3 flex-1 text-left"
                  >
                    <span
                      className={cn(
                        "w-5 h-5 border rounded-sm flex items-center justify-center transition shrink-0",
                        item.needs_refill
                          ? "bg-rust border-rust text-cream"
                          : "border-espresso/40"
                      )}
                    >
                      {item.needs_refill && <Check size={12} strokeWidth={3} />}
                    </span>
                    <span
                      className={cn(
                        "text-sm",
                        item.needs_refill && "text-rust font-medium"
                      )}
                    >
                      {item.name}
                    </span>
                  </button>
                  <button
                    onClick={() => remove(item)}
                    className="opacity-0 group-hover:opacity-100 text-ink-soft hover:text-burgundy transition"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Lägg till */}
        <div className="card p-4 mt-4">
          <div className="flex gap-2">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && add(isBar)}
              placeholder={isBar ? "Lägg till bar-item — t.ex. Aged rum" : "Lägg till skåp-item"}
              className="flex-1 bg-transparent border-b border-espresso/30 px-1 py-1.5 text-sm focus:outline-none focus:border-espresso"
            />
            <button onClick={() => add(isBar)} disabled={!newName.trim()} className="btn btn-primary text-xs">
              <Plus size={12} />
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <div>
      {/* Refill-status header */}
      {refillCount > 0 && (
        <div className="card p-4 mb-8 bg-cream-accent border-rust/30">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="eyebrow text-rust">Behöver fyllas på</p>
              <p className="text-2xl font-display mt-1">
                {refillCount} <span className="text-ink-soft text-base">items</span>
              </p>
            </div>
            <div className="flex gap-2">
              <button onClick={copyToClipboard} className="btn btn-ghost text-xs">
                <Copy size={12} />
                {copied ? "Kopierat!" : "Kopiera"}
              </button>
              <button onClick={exportToShopping} disabled={isPending} className="btn btn-primary text-xs">
                <ShoppingCart size={12} />
                Lägg på handlingen
              </button>
            </div>
          </div>
          {exportMsg && <p className="text-xs text-forest mt-2">{exportMsg}</p>}
        </div>
      )}

      {renderGroup("Baren", bar, true)}
      {other.length > 0 && renderGroup("Skafferi-basics", other, false)}
    </div>
  );
}
