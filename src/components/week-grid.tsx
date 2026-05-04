"use client";

import { useState, useTransition } from "react";
import { weekdayName, formatDateISO } from "@/lib/utils";
import { setEntryAction, setAbsenceAction } from "@/app/actions/meal-plan";
import { cn } from "@/lib/utils";
import { ShoppingBag, Sparkles, Users, Wine } from "lucide-react";
import { QuickAddDialog } from "./quick-add-dialog";
import { RecipeDialog } from "./recipe-dialog";
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

function slotsFor(day: Date): Slot[] {
  void day;
  return ["middag"];
}

interface Ingredient {
  recipe_id: string;
  name: string;
  quantity: number | null;
  unit: string | null;
  category: string | null;
  optional: boolean;
  order_index: number;
}

interface Recipe {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  prep_minutes: number | null;
  cook_minutes: number | null;
  servings: number;
  cuisine: string | null;
  difficulty: string | null;
  tags: string[];
  instructions: string[];
  source_url: string | null;
  ai_generated: boolean;
  rating?: number | null;
  rated_by?: string | null;
  rejected?: boolean;
  ingredients: Ingredient[];
}

interface PairedDrink {
  id: string;
  name: string;
  base_spirit: string | null;
  glass_type: string | null;
}

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
  lunch_for?: string[] | null;
  recipes?: Recipe | null;
  drink?: PairedDrink | null;
}

// Editorial accent per dag — cykliska men medvetna
const DAY_ACCENT = ["text-rust", "text-petrol", "text-camel", "text-olive", "text-forest", "text-burgundy", "text-rust"];
// Index 0 = måndag, 6 = söndag (sv-format)
function dayIndex(d: Date): number {
  const js = d.getDay(); // 0=sön, 1=mån
  return js === 0 ? 6 : js - 1;
}
function isWeekend(d: Date): boolean {
  const js = d.getDay();
  return js === 0 || js === 6;
}

function imageForCell(url: string | null | undefined, w: number): string | null {
  if (!url) return null;
  if (url.includes("image.pollinations.ai")) {
    return url.replace(/width=\d+/, `width=${w}`).replace(/height=\d+/, `height=${Math.round(w * 0.75)}`);
  }
  return url;
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
  const [showRecipe, setShowRecipe] = useState<{ recipe: Recipe; date: string; slot: Slot } | null>(null);
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
    <div className="space-y-3">
      {days.map((day) => {
        const accentClass = DAY_ACCENT[dayIndex(day)];
        const weekend = isWeekend(day);
        const slots = slotsFor(day);

        return (
          <article
            key={day.toISOString()}
            className={cn(
              "card overflow-hidden transition",
              weekend && "border-espresso/25"
            )}
          >
            {slots.map((slot) => {
              const entry = findEntry(day, slot);
              const recipeImg = entry?.recipes ? imageForCell(entry.recipes.image_url, 480) : null;
              const hasContent = !!(entry?.recipes || entry?.custom_title || entry?.takeaway);

              return (
                <div
                  key={slot}
                  className={cn(
                    "grid grid-cols-12 md:grid-cols-12 gap-0",
                    "border-l-4",
                    weekend ? `border-${DAY_ACCENT[dayIndex(day)].replace("text-", "")}` : "border-transparent"
                  )}
                  style={{
                    borderLeftColor: weekend
                      ? getComputedColor(DAY_ACCENT[dayIndex(day)])
                      : "transparent",
                  }}
                >
                  {/* Datum-kolumn */}
                  <div className="col-span-3 md:col-span-2 px-4 py-5 border-r border-espresso/10 flex flex-col justify-center">
                    <p className={cn("eyebrow", accentClass)}>
                      {weekdayName(day).slice(0, 3)}
                    </p>
                    <p className="font-display text-4xl md:text-5xl mt-1 leading-none tabular-nums">
                      {day.getDate()}
                    </p>
                    <p className="text-[10px] text-ink-soft uppercase tracking-[0.18em] mt-2">
                      {slot}
                    </p>
                  </div>

                  {/* Hero-bild om finns */}
                  {recipeImg && hasContent && (
                    <div className="col-span-9 md:col-span-3 relative aspect-[4/3] md:aspect-auto bg-cream-accent overflow-hidden border-r border-espresso/10">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={recipeImg}
                        alt=""
                        className="absolute inset-0 w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                  )}

                  {/* Innehåll */}
                  <div
                    className={cn(
                      "px-5 py-5 flex flex-col justify-between min-h-[120px]",
                      recipeImg && hasContent ? "col-span-12 md:col-span-7" : "col-span-9 md:col-span-10"
                    )}
                  >
                    <div className="flex-1">
                      {entry?.takeaway ? (
                        <button
                          onClick={() => setAbsenceFor({ date: formatDateISO(day), slot })}
                          className="text-left"
                        >
                          <p className="font-display italic text-rust text-xl leading-tight flex items-center gap-2">
                            <ShoppingBag size={16} />
                            {entry.takeaway_vendor || entry.takeaway_type || "Takeaway"}
                          </p>
                        </button>
                      ) : entry?.recipes ? (
                        <button
                          onClick={() => entry.recipes && setShowRecipe({ recipe: entry.recipes, date: formatDateISO(day), slot })}
                          className="text-left w-full group"
                        >
                          {entry.recipes.cuisine && (
                            <p className="eyebrow mb-1.5">{entry.recipes.cuisine}</p>
                          )}
                          <h3 className="font-display text-xl md:text-2xl leading-tight group-hover:text-rust transition">
                            {entry.recipes.title}
                          </h3>
                          {entry.recipes.description && (
                            <p className="text-xs text-ink-soft italic mt-1.5 line-clamp-2 max-w-md">
                              {entry.recipes.description}
                            </p>
                          )}
                          <div className="flex items-center gap-3 mt-3 text-[11px] text-ink-soft">
                            {(entry.recipes.prep_minutes || entry.recipes.cook_minutes) && (
                              <span className="tabular-nums">
                                {(entry.recipes.prep_minutes ?? 0) + (entry.recipes.cook_minutes ?? 0)} min
                              </span>
                            )}
                            {entry.recipes.rating ? (
                              <span className="text-rust tabular-nums">
                                {"★".repeat(entry.recipes.rating)}
                              </span>
                            ) : null}
                            {entry.drink && (
                              <span className="text-petrol flex items-center gap-1">
                                <Wine size={11} />
                                {entry.drink.name}
                              </span>
                            )}
                            {entry.lunch_for && entry.lunch_for.length > 0 && (
                              <span className="text-camel">
                                🍱 {entry.lunch_for.join(", ")}s lunch
                              </span>
                            )}
                          </div>
                        </button>
                      ) : entry?.custom_title ? (
                        <p className="text-base text-ink-soft italic">{entry.custom_title}</p>
                      ) : (
                        <button
                          onClick={() => setQuickAdd({ date: formatDateISO(day), slot })}
                          className="text-left text-ink-soft/60 hover:text-rust italic text-sm transition"
                        >
                          + lägg till med AI
                        </button>
                      )}
                    </div>

                    {/* Action-rad */}
                    <div className="flex items-center justify-between mt-3 -mx-2">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => toggleTakeaway(day, slot, entry)}
                          disabled={isPending}
                          className={cn(
                            "text-[10px] uppercase tracking-[0.18em] transition px-2 py-2 min-h-[36px]",
                            entry?.takeaway ? "text-rust" : "text-ink-soft hover:text-rust"
                          )}
                        >
                          {entry?.takeaway ? "↺ Laga själv" : "Takeaway"}
                        </button>
                      </div>
                      <div className="flex items-center gap-0.5">
                        {entry?.absent_member_names && entry.absent_member_names.length > 0 && (
                          <div className="flex -space-x-1.5 mr-1">
                            {entry.absent_member_names.map((name) => {
                              const m = members.find((mm) => mm.name === name);
                              return (
                                <span
                                  key={name}
                                  title={`${name} borta`}
                                  className={cn(
                                    "w-5 h-5 rounded-full flex items-center justify-center text-cream text-[9px] font-display ring-1 ring-cream-light opacity-50 line-through",
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
                          className="icon-btn icon-btn-rust"
                          style={{ minWidth: 36, minHeight: 36 }}
                        >
                          <Users size={14} />
                        </button>
                        {!entry?.takeaway && (
                          <button
                            onClick={() => setQuickAdd({ date: formatDateISO(day), slot })}
                            title="Lägg till med AI"
                            className="icon-btn icon-btn-rust"
                            style={{ minWidth: 36, minHeight: 36 }}
                          >
                            <Sparkles size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </article>
        );
      })}

      {showRecipe && (
        <RecipeDialog
          recipe={showRecipe.recipe}
          onClose={() => setShowRecipe(null)}
          planContext={{ plan_id: planId, date: showRecipe.date, slot: showRecipe.slot }}
        />
      )}

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

function getComputedColor(textClass: string): string {
  const map: Record<string, string> = {
    "text-rust": "#B5562B",
    "text-petrol": "#2E5C6E",
    "text-camel": "#C4A678",
    "text-olive": "#6B6B3A",
    "text-forest": "#3A4A35",
    "text-burgundy": "#6E2A2A",
  };
  return map[textClass] ?? "#B5562B";
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
