"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addPantryItemAction, removePantryItemAction, removeAlwaysHaveAction } from "@/app/actions/pantry";
import { Trash2, Plus, Pin } from "lucide-react";
import { cn } from "@/lib/utils";

interface PantryItem {
  id: string;
  name: string;
  quantity: number | null;
  unit: string | null;
  category: string | null;
  expiry_date: string | null;
}

interface AlwaysHave {
  id: string;
  display_name: string;
  category: string | null;
}

export function PantryList({
  householdId,
  items,
  alwaysHave,
}: {
  householdId: string;
  items: PantryItem[];
  alwaysHave: AlwaysHave[];
}) {
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("");
  const [category, setCategory] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function add() {
    if (!name.trim()) return;
    startTransition(async () => {
      await addPantryItemAction({
        household_id: householdId,
        name: name.trim(),
        quantity: quantity ? parseFloat(quantity) : null,
        unit: unit || null,
        category: category || null,
      });
      setName(""); setQuantity(""); setUnit(""); setCategory("");
      router.refresh();
    });
  }

  function remove(id: string) {
    startTransition(async () => {
      await removePantryItemAction(id);
      router.refresh();
    });
  }

  function removeAlways(id: string) {
    startTransition(async () => {
      await removeAlwaysHaveAction(id);
      router.refresh();
    });
  }

  // Gruppera per kategori
  const grouped = items.reduce<Record<string, PantryItem[]>>((acc, it) => {
    const key = it.category || "Övrigt";
    (acc[key] ||= []).push(it);
    return acc;
  }, {});

  return (
    <div className="grid md:grid-cols-3 gap-10">
      <div className="md:col-span-2">
        <div className="card p-5 mb-8">
          <p className="eyebrow mb-4">Lägg till</p>
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
            Skafferiet är tomt. Börja med att lägga till några basvaror.
          </p>
        )}

        {Object.entries(grouped).map(([cat, list]) => (
          <div key={cat} className="mb-8">
            <div className="divider mb-3">
              <p className="eyebrow">{cat}</p>
            </div>
            <ul>
              {list.map((it) => (
                <li
                  key={it.id}
                  className="flex items-center justify-between py-2.5 border-b border-espresso/10"
                >
                  <span className="text-sm">{it.name}</span>
                  <div className="flex items-center gap-4">
                    {(it.quantity || it.unit) && (
                      <span className="text-xs text-ink-soft tabular-nums">
                        {it.quantity}{it.unit && ` ${it.unit}`}
                      </span>
                    )}
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

      <aside>
        <div className="divider mb-3">
          <p className="eyebrow flex items-center gap-2">
            <Pin size={11} className="text-rust" />
            Alltid hemma
          </p>
        </div>
        <p className="text-xs text-ink-soft mb-4">
          Items här filtreras alltid bort från nya inköpslistor.
        </p>
        <ul>
          {alwaysHave.length === 0 && (
            <li className="text-xs text-ink-soft italic">
              Markera "kom ihåg" på inköpslistan så hamnar de här.
            </li>
          )}
          {alwaysHave.map((it) => (
            <li
              key={it.id}
              className="flex items-center justify-between py-2 border-b border-espresso/10"
            >
              <span className="text-sm">{it.display_name}</span>
              <button
                onClick={() => removeAlways(it.id)}
                className="text-ink-soft hover:text-burgundy transition"
              >
                <Trash2 size={12} />
              </button>
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}
