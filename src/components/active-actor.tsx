"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

const COLOR_MAP: Record<string, string> = {
  Filip: "bg-rust",
  Tine: "bg-petrol",
  Bill: "bg-camel",
  Todd: "bg-olive",
};

export function ActiveActor() {
  const [name, setName] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const cookies = document.cookie.split("; ");
    const c = cookies.find((c) => c.startsWith("sondag_actor="));
    if (!c) return;
    try {
      const raw = decodeURIComponent(c.split("=")[1]);
      const parsed = JSON.parse(raw);
      setName(parsed.name);
    } catch {}
  }, []);

  async function switchActor() {
    await fetch("/api/actor", { method: "DELETE" });
    router.push("/valj");
    router.refresh();
  }

  if (!name) return null;

  return (
    <button
      onClick={switchActor}
      className="flex items-center gap-2 px-2 text-xs text-ink-soft hover:text-espresso transition group min-h-[44px]"
      title="Byt användare"
    >
      <span
        className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center text-cream text-sm font-display",
          COLOR_MAP[name] ?? "bg-rust"
        )}
      >
        {name[0]}
      </span>
      <span className="hidden md:inline">{name}</span>
      <span className="text-ink-soft/50 group-hover:text-rust transition">↻</span>
    </button>
  );
}
