"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";

export function GenerateMenuButton({ planId }: { planId: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function generate() {
    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/menu/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan_id: planId }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error || "Något gick fel");
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="text-right">
      <button
        onClick={generate}
        disabled={isPending}
        className="btn btn-primary"
      >
        <Sparkles size={14} />
        {isPending ? "Genererar..." : "Generera vecka med AI"}
      </button>
      {error && <p className="text-xs text-burgundy mt-2">{error}</p>}
    </div>
  );
}
