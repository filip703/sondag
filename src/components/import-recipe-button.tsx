"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Link2, X } from "lucide-react";

export function ImportRecipeButton() {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function submit() {
    if (!url.trim().startsWith("http")) {
      setError("Klistra in en URL som börjar med http:// eller https://");
      return;
    }
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const res = await fetch("/api/recipes/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(j.error ?? "Kunde inte importera");
        return;
      }
      setSuccess(`Importerat: ${j.recipe?.title ?? "recept"}`);
      setUrl("");
      router.refresh();
      setTimeout(() => setOpen(false), 1500);
    });
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="btn btn-ghost text-xs"
        title="Importera recept från en URL"
      >
        <Link2 size={12} />
        Importera recept
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-espresso/40 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div className="card p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-1">
              <p className="eyebrow">Importera recept från URL</p>
              <button onClick={() => setOpen(false)} className="text-ink-soft hover:text-espresso">
                <X size={16} />
              </button>
            </div>
            <p className="text-xs text-ink-soft mb-4">
              koket.se, ica.se, alltommat.se, NYT Cooking — Claude extraherar recept, ingredienser och steg.
            </p>
            <input
              autoFocus
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              placeholder="https://www.koket.se/..."
              className="w-full bg-transparent border-b border-espresso/30 px-1 py-2 text-base focus:outline-none focus:border-espresso"
            />
            {error && <p className="text-xs text-burgundy mt-2">{error}</p>}
            {success && <p className="text-xs text-forest mt-2">{success}</p>}
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setOpen(false)} className="btn btn-ghost">
                Avbryt
              </button>
              <button onClick={submit} disabled={isPending || !url.trim()} className="btn btn-primary">
                {isPending ? "Hämtar..." : "Importera"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
