"use client";

import { useState, useTransition } from "react";
import { setDietPreferencesAction } from "@/app/actions/household";

export function SettingsForm({
  householdId,
  userId,
  initial,
}: {
  householdId: string;
  userId: string;
  initial: {
    allergies: string[];
    dislikes: string[];
    diet_type: string | null;
    notes: string | null;
  } | null;
}) {
  const [allergies, setAllergies] = useState((initial?.allergies ?? []).join(", "));
  const [dislikes, setDislikes] = useState((initial?.dislikes ?? []).join(", "));
  const [dietType, setDietType] = useState(initial?.diet_type ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaved(false);
    startTransition(async () => {
      await setDietPreferencesAction({
        household_id: householdId,
        user_id: userId,
        allergies: allergies.split(",").map((s) => s.trim()).filter(Boolean),
        dislikes: dislikes.split(",").map((s) => s.trim()).filter(Boolean),
        diet_type: dietType || null,
        notes: notes || null,
      });
      setSaved(true);
    });
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <div>
        <label className="eyebrow block mb-2">Allergier</label>
        <input
          value={allergies}
          onChange={(e) => setAllergies(e.target.value)}
          placeholder="t.ex. nötter, skaldjur"
          className="w-full bg-transparent border-b border-espresso/30 px-1 py-2 focus:outline-none focus:border-espresso"
        />
        <p className="text-xs text-ink-soft mt-1">Kommaseparerat</p>
      </div>
      <div>
        <label className="eyebrow block mb-2">Vi gillar inte</label>
        <input
          value={dislikes}
          onChange={(e) => setDislikes(e.target.value)}
          placeholder="t.ex. svamp, koriander"
          className="w-full bg-transparent border-b border-espresso/30 px-1 py-2 focus:outline-none focus:border-espresso"
        />
      </div>
      <div>
        <label className="eyebrow block mb-2">Kost-typ</label>
        <select
          value={dietType}
          onChange={(e) => setDietType(e.target.value)}
          className="w-full bg-cream-light border border-espresso/30 px-3 py-2 focus:outline-none focus:border-espresso"
        >
          <option value="">Allätare</option>
          <option value="vegetarian">Vegetarian</option>
          <option value="vegan">Vegan</option>
          <option value="pescetarian">Pescetarian</option>
          <option value="flexitarian">Flexitarian (kött 2 ggr/vecka)</option>
        </select>
      </div>
      <div>
        <label className="eyebrow block mb-2">Övriga preferenser</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="t.ex. snabbt på vardagar, mer pasta, husmanskost på söndagar"
          className="w-full bg-cream-light border border-espresso/30 px-3 py-2 focus:outline-none focus:border-espresso text-sm"
        />
      </div>
      <div className="flex items-center gap-4">
        <button type="submit" disabled={isPending} className="btn btn-primary">
          {isPending ? "Sparar..." : "Spara"}
        </button>
        {saved && <span className="text-sm text-ink-soft">Sparat.</span>}
      </div>
    </form>
  );
}
