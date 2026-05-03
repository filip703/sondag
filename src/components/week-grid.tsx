"use client";

import { useState, useTransition } from "react";
import { weekdayName, formatDateISO } from "@/lib/utils";
import { setEntryAction, setAbsenceAction } from "@/app/actions/meal-plan";
import { cn } from "@/lib/utils";
import { ShoppingBag, Sparkles, Users } from "lucide-react";
import { QuickAddDialog } from "./quick-add-dialog";
import { useRouter } from "next/navigation";

const COLOR_MAP: Record<string, string> = {
  rust: "bg-rust",
  petrol: "bg-petrol",
  camel: "bg-camel",
  olive: "bg-olive",
  forest: "bg-forest",
  burgundy: "bg-burgundy",
};

interface Member { id: string; name: string; avatar_color: string }

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
  absent_member_names: string[] | null;
  recipes?: { id: string; title: string; image_url: string | null; prep_minutes: number | null; cook_minutes: number | null } | null;
}

export function WeekGrid({
  days,
  entries,
  planId,
  members,
}: {
  days: Date[];
  entries: Entry[];
  planId: string;
  members: Member[];
}) {
  const router = useRouter();
  const [absenceFor, setAbsenceFor] = useState<{ date: string; slot: Slot } | null>(null);
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
                <div className="flex items-center justify-between mt-2 gap-2">
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
                  <div className="flex items-center gap-2">
                    {entry?.absent_member_names && entry.absent_member_names.length > 0 && (
                      <div className="flex -space-x-1.5">
                        {entry.absent_member_names.map((name) => {
                          const m = members.find((mm) => mm.name === name);
                          return (
                            <span
                              key={name}
                              title={`${name} borta`}
                              className={cn(
                                "w-4 h-4 rounded-full flex items-center justify-center text-cream text-[8px] font-display ring-1 ring-cream-light opacity-50 line-through",
                                m ? COLOR_MAP[m.avatar_color] ?? "bg-rust" : "bg-rust"
                              )}
                            >
                              {name[0]}
                            </span>
                          );
                        })}
                      </div>
                    )}
                    <button
                      onClick={() => setAbsenceFor({ date: formatDateISO(day), slot })}
                      title="Vem är borta"
                      className="text-ink-soft hover:text-rust transition"
                    >
                      <Users size={11} />
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

      {absenceFor && (
        <AbsenceDialog
          planId={planId}
          date={absenceFor.date}
          slot={absenceFor.slot}
          members={members}
          current={
            entries.find((e) => e.date === absenceFor.date && e.slot === absenceFor.slot)?.absent_member_names ??
            []
          }
          onClose={() => {
            setAbsenceFor(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

function AbsenceDialog({
  planId,
  date,
  slot,
  members,
  current,
  onClose,
}: {
  planId: string;
  date: string;
  slot: Slot;
  members: Member[];
  current: string[];
  onClose: () => void;
}) {
  const [absent, setAbsent] = useState<string[]>(current);
  const [isPending, startTransition] = useTransition();

  function toggle(name: string) {
    setAbsent((curr) =>
      curr.includes(name) ? curr.filter((n) => n !== name) : [...curr, name]
    );
  }

  function save() {
    startTransition(async () => {
      await setAbsenceAction({ plan_id: planId, date, slot, absent });
      onClose();
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-espresso/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div className="card p-6 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
        <p className="eyebrow mb-1">Vem är borta?</p>
        <p className="text-xs text-ink-soft mb-4">{date} · {slot}</p>
        <div className="grid grid-cols-2 gap-2">
          {members.map((m) => {
            const isAbsent = absent.includes(m.name);
            return (
              <button
                key={m.id}
                onClick={() => toggle(m.name)}
                className={cn(
                  "p-3 border rounded-sm transition flex items-center gap-2 text-sm",
                  isAbsent ? "border-rust bg-cream-accent" : "border-espresso/15 hover:border-espresso"
                )}
              >
                <span
                  className={cn(
                    "w-7 h-7 rounded-full flex items-center justify-center text-cream font-display",
                    COLOR_MAP[m.avatar_color] ?? "bg-rust",
                    isAbsent && "opacity-40"
                  )}
                >
                  {m.name[0]}
                </span>
                <span className={isAbsent ? "line-through text-ink-soft" : ""}>{m.name}</span>
              </button>
            );
          })}
        </div>
        <p className="text-xs text-ink-soft mt-4">
          Markerade är borta. AI:n ignorerar deras preferenser för just denna måltid.
        </p>
        <div className="flex justify-end gap-2 mt-6">
          <button onClick={onClose} className="btn btn-ghost">Avbryt</button>
          <button onClick={save} disabled={isPending} className="btn btn-primary">
            {isPending ? "Sparar..." : "Spara"}
          </button>
        </div>
      </div>
    </div>
  );
}
