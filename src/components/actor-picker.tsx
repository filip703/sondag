"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

const COLOR_MAP: Record<string, string> = {
  rust: "bg-rust",
  petrol: "bg-petrol",
  camel: "bg-camel",
  olive: "bg-olive",
  forest: "bg-forest",
  burgundy: "bg-burgundy",
};

interface Member {
  id: string;
  name: string;
  role: string;
  avatar_color: string;
}

export function ActorPicker({ members }: { members: Member[] }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function pick(m: Member) {
    startTransition(async () => {
      await fetch("/api/actor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: m.id, name: m.name }),
      });
      router.push("/vecka");
      router.refresh();
    });
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      {members.map((m) => (
        <button
          key={m.id}
          onClick={() => pick(m)}
          disabled={isPending}
          className="card p-6 hover:border-espresso transition group disabled:opacity-50"
        >
          <span
            className={cn(
              "w-16 h-16 rounded-full flex items-center justify-center text-cream font-display text-2xl mx-auto mb-3 group-hover:scale-105 transition",
              COLOR_MAP[m.avatar_color] ?? "bg-rust"
            )}
          >
            {m.name[0]}
          </span>
          <p className="font-medium">{m.name}</p>
          <p className="text-xs text-ink-soft mt-1">{m.role}</p>
        </button>
      ))}
    </div>
  );
}
