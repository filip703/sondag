"use client";

import { useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  addPantryItemAction,
  removePantryItemAction,
  movePantryItemAction,
} from "@/app/actions/pantry";
import { Trash2, Plus, Refrigerator, Snowflake, Package } from "lucide-react";
import { cn } from "@/lib/utils";

type Storage = "skafferi" | "kyl" | "frys";

interface PantryItem {
  id: string;
  name: string;
  quantity: number | null;
  unit: string | null;
  category: string | null;
  storage: Storage | null;
  expiry_date: string | null;
}

const TABS: { key: Storage; label: string; Icon: typeof Package }[] = [
  { key: "skafferi", label: "Skafferi", Icon: Package },
  { key: "kyl", label: "Kyl", Icon: Refrigerator },
  { key: "frys", label: "Frys", Icon: Snowflake },
];

export function PantryList({
  householdId,
  items,
}: {
  householdId: string;
  items: PantryItem[];
}) {
  const [activeTab, setActiveTab] = useState<Storage>("skafferi");
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("");
  const [category, setCategory] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const tabbed = useMemo(() => {
    const out: Record<Storage, PantryItem[]> = { skafferi: [], kyl: [], frys: [] };
    for (const it of items) {
      const s = (it.storage ?? "skafferi") as Storage;
      out[s].push(it);
    }
    return out;
  }, [items]);

  const visible = tabbed[activeTab];

  function add() {
    if (!name.trim()) return;
    startTransition(async () => {
      await addPantryItemAction({
        household_id: householdId,
        name: name.trim(),
        quantity: quantity ? parseFloat(quantity) : null,
        unit: unit || null,
        category: category || null,
        storage: activeTab,
      });
      setName("");
      setQuantity("");
      setUnit("");
      setCategory("");
      router.refresh();
    });
  }

  function remove(id: string) {
    startTransition(async () => {
      await removePantryItemAction(id);
      router.refresh();
    });
  }

  function move(id: string, target: Storage) {
    startTransition(async () => {
      await movePantryItemAction(id, target);
      router.refresh();
    });
  }

  const grouped = visible.reduce<Record<string, PantryItem[]>>((acc, it) => {
    const key = it.category || "Övrigt";
    (acc[key] ||= []).push(it);
    return acc;
  }, {});

  return (
    <div>
      {/* Tabs */}
      <div className="flex border-b border-espresso/15 mb-8">
        {TABS.map(({ key, label, Icon }) => {
          const count = tabbed[key].length;
          const active = key === activeTab;
          return (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={cn(
                "px-5 py-3 flex items-center gap-2 text-sm transition border-b-2 -mb-px",
                active
                  ? "border-rust text-espresso"
                  : "border-transparent text-ink-soft hover:text-espresso"
              )}
            >
              <Icon size={14} />
              <span>{label}</span>
              <span
                className={cn(
                  "text-xs tabular-nums",
                  active ? "text-rust" : "text-ink-soft/60"
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <div className="card p-5 mb-8 max-w-2xl">
        <p className="eyebrow mb-4">
          Lägg till i {TABS.find((t) => t.key === activeTab)?.label.toLowerCase()}
        </p>
        <div className="grid grid-cols-12 gap-3">
          <input
            className="col-span-12 md:col-span-5 bg-transparent border-b border-espresso/30 px-1 py-2 focus:outline-none focus:border-espresso"
            placeholder="t.ex. Pasta"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()}
          />
          <input
            className="col-span-4 md:col-span-2 bg-transparent border-b border-espresso/30 px-1 py-2 focus:outline-none focus:border-espresso"
            placeholder="500"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
          />
          <input
            className="col-span-4 md:col-span-2 bg-transparent border-b border-espresso/30 px-1 py-2 focus:outline-none focus:border-espresso"
            placeholder="g"
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
          />
          <input
            className="col-span-4 md:col-span-2 bg-transparent border-b border-espresso/30 px-1 py-2 focus:outline-none focus:border-espresso"
            placeholder="kategori"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          />
          <button
            onClick={add}
            disabled={isPending || !name.trim()}
            className="btn btn-primary col-span-12 md:col-span-1 justify-center"
          >
            <Plus size={14} />
          </button>
        </div>
      </div>

      {Object.entries(grouped).length === 0 && (
        <p className="text-sm text-ink-soft italic">
          Inget i {TABS.find((t) => t.key === activeTab)?.label.toLowerCase()} än.
          Markera "finns hemma" på inköpslistan eller scanna en streckkod.
        </p>
      )}

      <div className="grid md:grid-cols-2 gap-x-10 gap-y-1">
        {Object.entries(grouped).map(([cat, list]) => (
          <div key={cat} className="mb-6">
            <div className="divider mb-3">
              <p className="eyebrow">{cat}</p>
            </div>
            <ul>
              {list.map((it) => (
                <li
                  key={it.id}
                  className="flex items-center justify-between py-2.5 border-b border-espresso/10 group"
                >
                  <span className="text-sm">{it.name}</span>
                  <div className="flex items-center gap-3">
                    {(it.quantity || it.unit) && (
                      <span className="text-xs text-ink-soft tabular-nums">
                        {it.quantity}
                        {it.unit && ` ${it.unit}`}
                      </span>
                    )}
                    <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition">
                      {TABS.filter((t) => t.key !== activeTab).map(
                        ({ key, label, Icon }) => (
                          <button
                            key={key}
                            onClick={() => move(it.id, key)}
                            title={`Flytta till ${label.toLowerCase()}`}
                            className="text-ink-soft hover:text-petrol p-1"
                          >
                            <Icon size={12} />
                          </button>
                        )
                      )}
                    </div>
                    <button
                      onClick={() => remove(it.id)}
                      className="text-ink-soft hover:text-burgundy transition"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
