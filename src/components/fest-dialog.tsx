"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X, Sparkles, PartyPopper } from "lucide-react";

export function FestButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)} className="btn btn-ghost text-xs">
        <PartyPopper size={12} />
        Fest
      </button>
      {open && <FestDialog onClose={() => setOpen(false)} />}
    </>
  );
}

function FestDialog({ onClose }: { onClose: () => void }) {
  const [date, setDate] = useState(() => {
    const d = new Date();
    const day = d.getDay();
    // hoppa till nästa lördag som default
    const diff = day === 6 ? 0 : day === 0 ? 6 : 6 - day;
    d.setDate(d.getDate() + diff);
    return d.toISOString().slice(0, 10);
  });
  const [guests, setGuests] = useState(6);
  const [vibe, setVibe] = useState("OFYR-kväll, premium casual");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function generate() {
    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/menu/fest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, guest_count: guests, vibe, notes }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error ?? "AI-fel");
        return;
      }
      const j = await res.json();
      router.push(`/fest/${j.fest_id}`);
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-espresso/40 backdrop-blur-sm" onClick={onClose}>
      <div className="card p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-1">
          <p className="eyebrow flex items-center gap-2">
            <PartyPopper size={11} className="text-rust" />
            Planera fest
          </p>
          <button onClick={onClose} className="text-ink-soft hover:text-espresso"><X size={16} /></button>
        </div>
        <h2 className="font-display text-2xl mt-2 mb-6">
          Vad ska vi <em className="text-rust">bjuda på</em>.
        </h2>

        <div className="space-y-5">
          <div>
            <label className="eyebrow block mb-1">Datum</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-cream border border-espresso/30 px-2 py-2 focus:outline-none focus:border-espresso text-sm"
            />
          </div>
          <div>
            <label className="eyebrow block mb-1">Antal gäster</label>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setGuests(Math.max(2, guests - 1))}
                className="w-8 h-8 border border-espresso/30 rounded-sm hover:border-espresso"
              >
                −
              </button>
              <span className="text-2xl font-display tabular-nums w-10 text-center">{guests}</span>
              <button
                onClick={() => setGuests(guests + 1)}
                className="w-8 h-8 border border-espresso/30 rounded-sm hover:border-espresso"
              >
                +
              </button>
              <span className="text-xs text-ink-soft ml-2">personer totalt</span>
            </div>
          </div>
          <div>
            <label className="eyebrow block mb-1">Stil</label>
            <select
              value={vibe}
              onChange={(e) => setVibe(e.target.value)}
              className="w-full bg-cream border border-espresso/30 px-2 py-2 focus:outline-none focus:border-espresso text-sm"
            >
              <option>OFYR-kväll, premium casual</option>
              <option>Boutique middag, dim lighting</option>
              <option>Sommar-uteservering</option>
              <option>Adult tiki-kväll</option>
              <option>Asiatisk feast, share-style</option>
              <option>Italiensk lång middag</option>
              <option>Streetfood-kväll</option>
            </select>
          </div>
          <div>
            <label className="eyebrow block mb-1">Anteckningar</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="t.ex. en gäst är vegetarian, vi har lax i frysen, ingen fisk"
              className="w-full bg-cream border border-espresso/30 px-2 py-1.5 focus:outline-none focus:border-espresso text-sm"
            />
          </div>
        </div>

        {error && <p className="text-sm text-burgundy mt-3">{error}</p>}

        <div className="flex justify-end gap-2 mt-6">
          <button onClick={onClose} className="btn btn-ghost">Avbryt</button>
          <button onClick={generate} disabled={isPending} className="btn btn-primary">
            <Sparkles size={14} />
            {isPending ? "Designar menyn..." : "Generera"}
          </button>
        </div>
      </div>
    </div>
  );
}
