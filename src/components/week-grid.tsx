"use client";

import { useState, useTransition } from "react";
import { weekdayName, formatDateISO } from "@/lib/utils";
import { setEntryAction } from "@/app/actions/meal-plan";
import { cn } from "@/lib/utils";
import { ShoppingBag, Sparkles } from "lucide-react";
import { QuickAddDialog } from "./quick-add-dialog";

type Slot = "frukost" | "lunch" | "middag";
const SLOTS: Slot[] = ["frukost", "lunch", "middag"];

interface Entry {
  id: string;
  date: string;
  slot: string;
  recipe_id: string | null;
  custom_title: string | null;
  takeaway: boolean;
  takeaway_type: string | null;
  takeaway_vendor: string | null;
  takeaway_cost: number | null;
  recipes?: { id: string; title: string; image_url: string | null; prep_minutes: number | null; cook_minutes: number | null } | null;
}

export function WeekGrid({
  days,
  entries,
  planId,
}: {
  days: Date[];
  entries: Entry[];
  planId: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [quickAdd, setQuickAdd] = useState<{ date: string; slot: Slot } | null>(null);

  function findEntry(date: Date, slot: Slot) {
    const iso = formatDateISO(date);
    return entries.find((e) => e.date === iso && e.slot === slot);
  }

  function toggleTakeaway(date: Date, slot: Slot, current?: Entry) {
    startTransition(async () => {
      await setEntryAction({
        plan_id: planId,
        date: formatDateISO(date),
        slot,
        takeaway: !current?.takeaway,
        custom_title: current?.takeaway ? null : "Takeaway",
      });
    });
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-7 gap-px bg-espresso/15 border border-espresso/15">
      {days.map((day) => (
        <div key={day.toISOString()} className="bg-cream-light flex flex-col">
          <div className="px-4 pt-4 pb-3 border-b border-espresso/10">
            <p className="eyebrow">{weekdayName(day)}</p>
            <p className="font-display text-2xl mt-1">{day.getDate()}</p>
          </div>
          {SLOTS.map((slot) => {
            const entry = findEntry(day, slot);
            const hasContent = entry?.recipes || entry?.custom_title || entry?.takeaway;
            return (
              <div
                key={slot}
                className={cn(
                  "px-4 py-3 border-b border-espresso/10 last:border-b-0 min-h-[88px] flex flex-col justify-between",
                  hasContent && "bg-cream"
                )}
              >
                <div>
                  <p className="text-[10px] uppercase tracking-[0.18em] text-ink-soft mb-1">
                    {slot}
                  </p>
                  {entry?.takeaway ? (
                    <p className="text-sm font-medium flex items-center gap-1.5">
                      <ShoppingBag size={12} className="text-rust" />
                      {entry.takeaway_vendor || entry.takeaway_type || "Takeaway"}
                    </p>
                  ) : entry?.recipes ? (
                    <p className="text-sm font-medium leading-snug">
                      {entry.recipes.title}
                    </p>
                  ) : entry?.custom_title ? (
                    <p className="text-sm leading-snug">{entry.custom_title}</p>
                  ) : (
                    <p className="text-sm text-ink-soft/60">—</p>
                  )}
                </div>
                <div className="flex items-center justify-between mt-2">
                  <button
                    onClick={() => toggleTakeaway(day, slot, entry)}
                    disabled={isPending}
                    className={cn(
                      "text-[10px] uppercase tracking-[0.18em] transition",
                      entry?.takeaway
                        ? "text-rust"
                        : "text-ink-soft hover:text-rust"
                    )}
                  >
                    {entry?.takeaway ? "↺ Laga själv" : "Takeaway"}
                  </button>
                  {!entry?.takeaway && (
                    <button
                      onClick={() => setQuickAdd({ date: formatDateISO(day), slot })}
                      title="Lägg till med AI"
                      className="text-ink-soft hover:text-rust transition"
                    >
                      <Sparkles size={11} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ))}

      {quickAdd && (
        <QuickAddDialog
          planId={planId}
          date={quickAdd.date}
          slot={quickAdd.slot}
          onClose={() => setQuickAdd(null)}
        />
      )}
    </div>
  );
}
