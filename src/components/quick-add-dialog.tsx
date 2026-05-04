"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, X } from "lucide-react";
import { useToast } from "./toast";

export function QuickAddDialog({
  planId,
  date,
  slot,
  onClose,
}: {
  planId: string;
  date: string;
  slot: string;
  onClose: () => void;
}) {
  const [prompt, setPrompt] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  function submit() {
    if (!prompt.trim()) return;
    startTransition(async () => {
      const res = await fetch("/api/menu/quick-add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan_id: planId, date, slot, prompt: prompt.trim() }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(j.error || "Kunde inte skapa receptet");
        return;
      }
      toast.success(`"${j.recipe?.title}" tillagd på ${date}`);
      onClose();
      router.refresh();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-espresso/40 backdrop-blur-sm" onClick={onClose}>
      <div className="card p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-1">
          <p className="eyebrow">Lägg till för hand</p>
          <button onClick={onClose} className="text-ink-soft hover:text-espresso">
            <X size={16} />
          </button>
        </div>
        <p className="text-xs text-ink-soft mb-4">{date} · {slot}</p>
        <input
          autoFocus
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder='t.ex. "gryta", "kycklingpasta", "vad som helst med lax"'
          className="w-full bg-transparent border-b border-espresso/30 px-1 py-2 text-base focus:outline-none focus:border-espresso"
        />
        <p className="text-xs text-ink-soft mt-2">
          AI:n bygger ett recept och lägger ingredienserna på inköpslistan.
        </p>

        <div className="flex justify-end gap-2 mt-6">
          <button onClick={onClose} className="btn btn-ghost">Avbryt</button>
          <button onClick={submit} disabled={isPending || !prompt.trim()} className="btn btn-primary">
            <Sparkles size={14} />
            {isPending ? "Bygger..." : "Lägg till"}
          </button>
        </div>
      </div>
    </div>
  );
}
