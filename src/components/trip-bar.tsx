"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plane, X, Plus } from "lucide-react";
import { addTripAction, removeTripAction } from "@/app/actions/trips";

interface Trip {
  id: string;
  start_date: string;
  end_date: string;
  title: string;
  notes: string | null;
}

function fmt(iso: string): string {
  return new Date(iso).toLocaleDateString("sv-SE", { day: "numeric", month: "short" });
}

export function TripBar({ trips }: { trips: Trip[] }) {
  const router = useRouter();
  const [show, setShow] = useState(false);

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {trips.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {trips.map((t) => (
            <li
              key={t.id}
              className="inline-flex items-center gap-2 bg-cream-accent text-xs px-3 py-1.5 rounded-sm"
            >
              <Plane size={11} className="text-petrol" />
              <span className="font-medium">{t.title}</span>
              <span className="text-ink-soft">
                {fmt(t.start_date)} → {fmt(t.end_date)}
              </span>
              <button
                onClick={async () => {
                  await removeTripAction(t.id);
                  router.refresh();
                }}
                className="text-ink-soft hover:text-burgundy"
                aria-label="Ta bort resa"
              >
                <X size={11} />
              </button>
            </li>
          ))}
        </ul>
      )}
      <button onClick={() => setShow(true)} className="btn btn-ghost text-xs">
        <Plane size={12} />
        {trips.length > 0 ? "+ Resa" : "Markera resa"}
      </button>
      {show && <TripDialog onClose={() => setShow(false)} />}
    </div>
  );
}

function TripDialog({ onClose }: { onClose: () => void }) {
  const today = new Date().toISOString().slice(0, 10);
  const [start, setStart] = useState(today);
  const [end, setEnd] = useState(today);
  const [title, setTitle] = useState("Borta");
  const [notes, setNotes] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function save() {
    startTransition(async () => {
      await addTripAction({
        start_date: start,
        end_date: end,
        title: title.trim() || "Borta",
        notes: notes.trim() || undefined,
      });
      router.refresh();
      onClose();
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-espresso/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div className="card p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-1">
          <p className="eyebrow flex items-center gap-2">
            <Plane size={11} className="text-petrol" />
            Markera resa
          </p>
          <button onClick={onClose} className="text-ink-soft hover:text-espresso">
            <X size={16} />
          </button>
        </div>
        <h2 className="font-display text-2xl mt-2 mb-6">
          När är ni <em className="text-rust">borta</em>?
        </h2>

        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="eyebrow block mb-1">Från</label>
              <input
                type="date"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                className="w-full bg-cream border border-espresso/30 px-2 py-2 focus:outline-none focus:border-espresso text-sm"
              />
            </div>
            <div>
              <label className="eyebrow block mb-1">Till</label>
              <input
                type="date"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                className="w-full bg-cream border border-espresso/30 px-2 py-2 focus:outline-none focus:border-espresso text-sm"
              />
            </div>
          </div>
          <div>
            <label className="eyebrow block mb-1">Titel</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="t.ex. Mallorca, Föräldrar bortrest, Fjällen"
              className="w-full bg-transparent border-b border-espresso/30 px-1 py-2 focus:outline-none focus:border-espresso text-sm"
            />
          </div>
          <div>
            <label className="eyebrow block mb-1">Anteckningar</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="t.ex. bara Tine och Bill, åter söndag kväll"
              className="w-full bg-cream border border-espresso/30 px-2 py-1.5 focus:outline-none focus:border-espresso text-sm"
            />
          </div>
        </div>

        <p className="text-xs text-ink-soft mt-4">
          AI:n hoppar över dessa dagar i menygenereringen och planerar inga inköp för dem.
        </p>

        <div className="flex justify-end gap-2 mt-6">
          <button onClick={onClose} className="btn btn-ghost">Avbryt</button>
          <button onClick={save} disabled={isPending} className="btn btn-primary">
            <Plus size={14} />
            {isPending ? "Sparar..." : "Spara"}
          </button>
        </div>
      </div>
    </div>
  );
}
