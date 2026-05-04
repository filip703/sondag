"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { useToast } from "./toast";

export function GenerateMenuButton({ planId }: { planId: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  async function generate() {
    startTransition(async () => {
      const res = await fetch("/api/menu/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan_id: planId }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(j.error || "Något gick fel — försök igen");
        return;
      }
      toast.success(j.notes ? `Veckomenyn klar — ${j.notes}` : "Veckomenyn är klar");
      router.refresh();
    });
  }

  return (
    <button
      onClick={generate}
      disabled={isPending}
      className="btn btn-primary"
    >
      <Sparkles size={14} />
      {isPending ? "Genererar..." : "Generera vecka med AI"}
    </button>
  );
}
