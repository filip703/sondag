"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  upsertFamilyMemberAction,
  deleteFamilyMemberAction,
} from "@/app/actions/household";
import { Plus, Trash2, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface Member {
  id: string;
  name: string;
  role: "vuxen" | "barn" | "tonåring";
  age: number | null;
  avatar_color: string;
  eats_red_meat: boolean;
  eats_fish: boolean;
  eats_chicken: boolean;
  eats_pork: boolean;
  vegetarian: boolean;
  vegan: boolean;
  allergies: string[];
  loves: string[];
  dislikes: string[];
  always_eats: string[];
  food_strategy: string | null;
  notes: string | null;
}

interface Profile {
  cooking_style: string | null;
  weekday_minutes_max: number;
  takeaway_per_week: number;
  weekly_recurring: Record<string, string>;
  flavor_profile: string[];
  avoid: string[];
  budget_level: string;
  notes: string | null;
}

const COLOR_MAP: Record<string, string> = {
  rust: "bg-rust",
  petrol: "bg-petrol",
  camel: "bg-camel",
  olive: "bg-olive",
  forest: "bg-forest",
  burgundy: "bg-burgundy",
};

export function FamilyEditor({
  householdId,
  members,
  profile,
}: {
  householdId: string;
  members: Member[];
  profile: Profile | null;
}) {
  const router = useRouter();
  const [openId, setOpenId] = useState<string | null>(members[0]?.id ?? null);

  return (
    <div className="grid md:grid-cols-3 gap-10">
      <div className="md:col-span-2">
        <ul className="space-y-3">
          {members.map((m) => (
            <MemberCard
              key={m.id}
              member={m}
              householdId={householdId}
              isOpen={openId === m.id}
              onToggle={() => setOpenId(openId === m.id ? null : m.id)}
              onDeleted={() => router.refresh()}
            />
          ))}
        </ul>

        <button
          onClick={() => addNewMember(householdId, router.refresh)}
          className="btn btn-ghost w-full justify-center mt-4"
        >
          <Plus size={14} />
          Lägg till familjemedlem
        </button>
      </div>

      <aside>
        <div className="divider mb-4">
          <p className="eyebrow">Hushållets matstil</p>
        </div>
        {profile ? (
          <div className="space-y-4 text-sm">
            {profile.cooking_style && (
              <p className="text-ink-soft leading-relaxed italic">
                {profile.cooking_style}
              </p>
            )}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <p className="eyebrow mb-1">Vardagstid</p>
                <p>max {profile.weekday_minutes_max} min</p>
              </div>
              <div>
                <p className="eyebrow mb-1">Takeaway</p>
                <p>{profile.takeaway_per_week}×/vecka</p>
              </div>
            </div>
            {Object.keys(profile.weekly_recurring).length > 0 && (
              <div>
                <p className="eyebrow mb-2">Veckorutiner</p>
                <ul className="space-y-1 text-xs">
                  {Object.entries(profile.weekly_recurring).map(([day, rule]) => (
                    <li key={day}>
                      <span className="text-rust">{day}:</span> {rule}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {profile.flavor_profile.length > 0 && (
              <div>
                <p className="eyebrow mb-2">Smakprofil</p>
                <div className="flex flex-wrap gap-1.5">
                  {profile.flavor_profile.map((f) => (
                    <span
                      key={f}
                      className="text-xs px-2 py-0.5 bg-cream-accent rounded-sm"
                    >
                      {f}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-ink-soft italic">
            Ingen hushållsprofil sparad än.
          </p>
        )}
      </aside>
    </div>
  );
}

function MemberCard({
  member: m,
  householdId,
  isOpen,
  onToggle,
  onDeleted,
}: {
  member: Member;
  householdId: string;
  isOpen: boolean;
  onToggle: () => void;
  onDeleted: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [draft, setDraft] = useState({
    name: m.name,
    role: m.role,
    eats_red_meat: m.eats_red_meat,
    eats_fish: m.eats_fish,
    eats_chicken: m.eats_chicken,
    eats_pork: m.eats_pork,
    vegetarian: m.vegetarian,
    allergies: m.allergies.join(", "),
    loves: m.loves.join(", "),
    dislikes: m.dislikes.join(", "),
    always_eats: m.always_eats.join(", "),
    food_strategy: m.food_strategy ?? "",
    notes: m.notes ?? "",
  });

  function save() {
    startTransition(async () => {
      await upsertFamilyMemberAction({
        id: m.id,
        household_id: householdId,
        name: draft.name,
        role: draft.role,
        eats_red_meat: draft.eats_red_meat,
        eats_fish: draft.eats_fish,
        eats_chicken: draft.eats_chicken,
        eats_pork: draft.eats_pork,
        vegetarian: draft.vegetarian,
        allergies: draft.allergies.split(",").map((s) => s.trim()).filter(Boolean),
        loves: draft.loves.split(",").map((s) => s.trim()).filter(Boolean),
        dislikes: draft.dislikes.split(",").map((s) => s.trim()).filter(Boolean),
        always_eats: draft.always_eats.split(",").map((s) => s.trim()).filter(Boolean),
        food_strategy: draft.food_strategy || null,
        notes: draft.notes || null,
      });
      onDeleted();
    });
  }

  function remove() {
    startTransition(async () => {
      await deleteFamilyMemberAction(m.id);
      onDeleted();
    });
  }

  return (
    <li className="card overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-4 p-4 text-left"
      >
        <span
          className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center text-cream font-display text-lg",
            COLOR_MAP[m.avatar_color] ?? "bg-rust"
          )}
        >
          {m.name[0]}
        </span>
        <div className="flex-1">
          <p className="font-medium">{m.name}</p>
          <p className="text-xs text-ink-soft">
            {m.role}
            {m.allergies.length > 0 && ` · ${m.allergies.length} allergier`}
            {!m.eats_red_meat && " · ej rött kött"}
            {m.vegetarian && " · vegetarian"}
          </p>
        </div>
        <ChevronDown
          size={16}
          className={cn(
            "text-ink-soft transition",
            isOpen && "rotate-180"
          )}
        />
      </button>

      {isOpen && (
        <div className="border-t border-espresso/10 p-5 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="eyebrow block mb-1">Namn</label>
              <input
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                className="w-full bg-transparent border-b border-espresso/30 px-1 py-1.5 focus:outline-none focus:border-espresso text-sm"
              />
            </div>
            <div>
              <label className="eyebrow block mb-1">Roll</label>
              <select
                value={draft.role}
                onChange={(e) => setDraft({ ...draft, role: e.target.value as Member["role"] })}
                className="w-full bg-cream border border-espresso/30 px-2 py-1.5 focus:outline-none text-sm"
              >
                <option value="vuxen">vuxen</option>
                <option value="tonåring">tonåring</option>
                <option value="barn">barn</option>
              </select>
            </div>
          </div>

          <div>
            <label className="eyebrow block mb-2">Äter</label>
            <div className="flex flex-wrap gap-3 text-sm">
              {[
                { key: "eats_red_meat", label: "rött kött" },
                { key: "eats_fish", label: "fisk" },
                { key: "eats_chicken", label: "kyckling" },
                { key: "eats_pork", label: "fläsk" },
                { key: "vegetarian", label: "vegetarian" },
              ].map((opt) => (
                <label key={opt.key} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={draft[opt.key as keyof typeof draft] as boolean}
                    onChange={(e) =>
                      setDraft({ ...draft, [opt.key]: e.target.checked } as typeof draft)
                    }
                    className="accent-rust"
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </div>

          <Field
            label="Allergier (STRIKT)"
            value={draft.allergies}
            onChange={(v) => setDraft({ ...draft, allergies: v })}
            placeholder="t.ex. nötter, skaldjur"
            hint="Kommaseparerat. Aldrig förhandlingsbart i AI-genereringen."
          />
          <Field
            label="Älskar"
            value={draft.loves}
            onChange={(v) => setDraft({ ...draft, loves: v })}
            placeholder="t.ex. tacos, pasta, sushi"
            hint="Väger upp i menygenereringen."
          />
          <Field
            label="Gillar inte"
            value={draft.dislikes}
            onChange={(v) => setDraft({ ...draft, dislikes: v })}
            placeholder="t.ex. svamp, koriander"
          />
          <Field
            label="Safe foods / vill alltid kunna äta"
            value={draft.always_eats}
            onChange={(v) => setDraft({ ...draft, always_eats: v })}
            placeholder="t.ex. parmesan, pasta, ketchup"
            hint="För selektiva ätare — säkerställer att rätten har komponenter de äter."
          />
          <div>
            <label className="eyebrow block mb-1">Strategi</label>
            <textarea
              value={draft.food_strategy}
              onChange={(e) => setDraft({ ...draft, food_strategy: e.target.value })}
              rows={2}
              placeholder="t.ex. Selektiv. Separera komponenter — tvinga aldrig ihop-rörda rätter."
              className="w-full bg-cream border border-espresso/30 px-2 py-1.5 focus:outline-none text-sm"
            />
          </div>
          <div>
            <label className="eyebrow block mb-1">Anteckningar</label>
            <textarea
              value={draft.notes}
              onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
              rows={2}
              className="w-full bg-cream border border-espresso/30 px-2 py-1.5 focus:outline-none text-sm"
            />
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-espresso/10">
            <button
              onClick={remove}
              disabled={isPending}
              className="text-xs text-burgundy hover:underline flex items-center gap-1.5"
            >
              <Trash2 size={12} /> Ta bort
            </button>
            <button
              onClick={save}
              disabled={isPending}
              className="btn btn-primary"
            >
              {isPending ? "Sparar..." : "Spara"}
            </button>
          </div>
        </div>
      )}
    </li>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  hint?: string;
}) {
  return (
    <div>
      <label className="eyebrow block mb-1">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-transparent border-b border-espresso/30 px-1 py-1.5 focus:outline-none focus:border-espresso text-sm"
      />
      {hint && <p className="text-xs text-ink-soft mt-1">{hint}</p>}
    </div>
  );
}

async function addNewMember(householdId: string, refresh: () => void) {
  await upsertFamilyMemberAction({
    household_id: householdId,
    name: "Ny medlem",
    role: "vuxen",
  });
  refresh();
}
