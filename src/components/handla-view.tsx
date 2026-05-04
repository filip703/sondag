"use client";

import { useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, RefreshCw, ShoppingCart, Store, Trash2, Home, PackageCheck, X, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { aisleOrder, aisleLabel } from "@/lib/store-layout";
import {
  toggleCheckedAction,
  removeShoppingItemAction,
  restoreShoppingItemAction,
  moveToHomeAction,
  finishShoppingAction,
} from "@/app/actions/shopping-list";
import { useToast } from "./toast";

interface Item {
  id: string;
  name: string;
  quantity: number | null;
  unit: string | null;
  category: string | null;
  have_at_home: boolean;
  checked: boolean;
  notes: string | null;
}

interface List {
  id: string;
  name: string;
  status: string;
  ica_list_id: string | null;
  synced_at: string | null;
}

export function HandlaView({
  list,
  items,
  storeName,
  lastSynced,
  sectionNo,
}: {
  list: List;
  items: Item[];
  storeName: string;
  lastSynced: string | null;
  sectionNo?: string;
}) {
  void sectionNo;
  const [isPending, startTransition] = useTransition();
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [confirmFinish, setConfirmFinish] = useState(false);
  const router = useRouter();
  const toast = useToast();

  // Filtrera bort have_at_home, gruppera per gångordning
  const visible = useMemo(
    () =>
      items
        .filter((i) => !i.have_at_home)
        .sort((a, b) => {
          const ao = aisleOrder(a.category) - aisleOrder(b.category);
          return ao !== 0 ? ao : a.name.localeCompare(b.name, "sv");
        }),
    [items]
  );

  const grouped = useMemo(() => {
    const out: Record<string, Item[]> = {};
    for (const it of visible) {
      const key = it.category ?? "övrigt";
      (out[key] ||= []).push(it);
    }
    return out;
  }, [visible]);

  const total = visible.length;
  const done = visible.filter((i) => i.checked).length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  function toggle(item: Item) {
    startTransition(async () => {
      await toggleCheckedAction(item.id, !item.checked);
      router.refresh();
    });
  }

  function remove(item: Item) {
    startTransition(async () => {
      const snap = await removeShoppingItemAction(item.id);
      router.refresh();
      if (snap) {
        toast.show(`"${item.name}" borttaget`, {
          variant: "info",
          action: {
            label: "Ångra",
            onClick: async () => {
              await restoreShoppingItemAction(snap);
              router.refresh();
            },
          },
        });
      }
    });
  }

  function moveToHome(item: Item) {
    startTransition(async () => {
      await moveToHomeAction(item.id);
      router.refresh();
      toast.success(`"${item.name}" flyttad hem`);
    });
  }

  function doFinishShopping() {
    setConfirmFinish(false);
    startTransition(async () => {
      const res = await finishShoppingAction();
      router.refresh();
      toast.success(`${res.moved} varor flyttade hem — ny lista skapad`);
    });
  }

  async function copyToClipboard() {
    const text = Object.entries(grouped)
      .map(([cat, list]) => {
        const head = `# ${aisleLabel(cat)}`;
        const lines = list
          .filter((i) => !i.checked)
          .map((i) => {
            const qty = i.quantity ? `${i.quantity}${i.unit ? ` ${i.unit}` : ""}` : "";
            return qty ? `- ${i.name}, ${qty}` : `- ${i.name}`;
          });
        return [head, ...lines].join("\n");
      })
      .join("\n\n");

    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  async function syncToIca() {
    setIsSyncing(true);
    setSyncMsg(null);
    try {
      const res = await fetch("/api/ica/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ list_id: list.id }),
      });
      const j = await res.json().catch(() => ({}));
      setSyncMsg(res.ok ? `Synkad — ${j.synced ?? "?"} items` : j.error ?? "Sync misslyckades");
      if (res.ok) router.refresh();
    } finally {
      setIsSyncing(false);
    }
  }

  return (
    <div className="-mx-6 -my-10 md:mx-0 md:my-0">
      {/* Header */}
      <div className="sticky top-[57px] z-40 bg-cream border-b border-espresso/15 px-6 py-4 md:rounded-sm md:border md:relative md:top-0">
        <div className="flex items-center justify-between mb-2">
          <div>
            <span className="section-no text-sm tabular-nums">No. 02</span>
            <p className="eyebrow flex items-center gap-2 mt-1">
              <Store size={11} />
              {storeName}
            </p>
            <h1 className="font-display text-3xl md:text-4xl mt-1">
              Handla
            </h1>
          </div>
          <div className="text-right">
            <p className="text-2xl font-display tabular-nums">
              {done} <span className="text-ink-soft">/</span> {total}
            </p>
            <p className="eyebrow">{pct}% klart</p>
          </div>
        </div>
        <div className="bg-cream-accent rounded-sm h-1.5 overflow-hidden">
          <div
            className="bg-rust h-full transition-all"
            style={{ width: `${Math.max(pct, 2)}%` }}
          />
        </div>
        <div className="flex gap-2 mt-3 flex-wrap">
          <button
            onClick={copyToClipboard}
            className="btn btn-ghost text-xs"
          >
            <Copy size={12} />
            {copied ? "Kopierat!" : "Kopiera"}
          </button>
          <button
            onClick={syncToIca}
            disabled={isSyncing}
            className="btn btn-ghost text-xs"
          >
            <RefreshCw size={12} className={isSyncing ? "animate-spin" : ""} />
            {isSyncing ? "Synkar..." : "Synka"}
          </button>
          {done > 0 && (
            <button
              onClick={() => setConfirmFinish(true)}
              disabled={isPending}
              className="btn btn-primary text-xs flex-1 justify-center"
              title="Flytta alla avbockade varor till hemma och starta ny lista"
            >
              <PackageCheck size={12} />
              Klar — flytta {done} hem
            </button>
          )}
        </div>
        {syncMsg && <p className="text-xs text-ink-soft mt-2">{syncMsg}</p>}
        {lastSynced && (
          <p className="text-[10px] text-ink-soft mt-1">
            Senast synkad {new Date(lastSynced).toLocaleString("sv-SE", { dateStyle: "short", timeStyle: "short" })}
          </p>
        )}
      </div>

      {/* Konfirmation: avsluta handlingen */}
      {confirmFinish && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-espresso/40 backdrop-blur-sm"
          onClick={() => setConfirmFinish(false)}
        >
          <div className="card p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <PackageCheck size={20} className="text-rust" />
                <p className="eyebrow">Avsluta handlingen</p>
              </div>
              <button onClick={() => setConfirmFinish(false)} className="icon-btn">
                <X size={16} />
              </button>
            </div>
            <h2 className="font-display text-2xl mb-2">
              Flytta <em className="text-rust">{done}</em> varor hem?
            </h2>
            <p className="text-sm text-ink-soft">
              Avbockade varor hamnar i skafferi/kyl/frys auto-klassade. En ny tom lista skapas för nästa vecka.
            </p>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setConfirmFinish(false)} className="btn btn-ghost">Avbryt</button>
              <button onClick={doFinishShopping} disabled={isPending} className="btn btn-primary">
                <PackageCheck size={14} />
                Ja, flytta hem
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Listan */}
      <div className="px-6 py-6 md:p-0 md:mt-8">
        {total === 0 && (
          <div className="text-center py-16 max-w-sm mx-auto">
            <ShoppingCart size={32} className="mx-auto text-rust mb-5" />
            <h3 className="font-display text-2xl mb-3">
              Inget på <em className="text-rust">listan</em>.
            </h3>
            <p className="text-sm text-ink-soft mb-6">
              Generera veckomenyn så fyller AI:n listan automatiskt.
              Eller skriv "Importera recept" från en URL.
            </p>
            <div className="flex flex-col gap-2">
              <a href="/vecka" className="btn btn-primary justify-center">
                Till veckomenyn
              </a>
              <a href="/skap" className="btn btn-ghost justify-center text-xs">
                Eller fyll på från skåpet
              </a>
            </div>
          </div>
        )}

        {Object.entries(grouped).map(([cat, list]) => {
          const catTotal = list.length;
          const catDone = list.filter((i) => i.checked).length;
          const allDone = catTotal > 0 && catDone === catTotal;
          return (
            <section key={cat} className={cn("mb-8", allDone && "opacity-50")}>
              <div className="flex items-center justify-between mb-2">
                <h2 className="font-display text-xl">{aisleLabel(cat)}</h2>
                <span className="text-xs text-ink-soft tabular-nums">
                  {catDone}/{catTotal}
                </span>
              </div>
              <div className="border-t border-espresso/15">
                {list.map((item) => (
                  <div
                    key={item.id}
                    className={cn(
                      "w-full flex items-center gap-3 py-3 border-b border-espresso/10 transition group",
                      item.checked && "bg-cream-light/50"
                    )}
                  >
                    <button
                      onClick={() => toggle(item)}
                      disabled={isPending}
                      className="flex items-center gap-4 flex-1 text-left active:bg-cream-accent -my-1 py-1 px-2 -ml-2 rounded-sm"
                    >
                      <span
                        className={cn(
                          "w-7 h-7 border rounded-sm flex items-center justify-center transition shrink-0",
                          item.checked
                            ? "bg-espresso border-espresso text-cream"
                            : "border-espresso/40"
                        )}
                      >
                        {item.checked && <Check size={16} strokeWidth={3} />}
                      </span>
                      <div className="flex-1">
                        <p
                          className={cn(
                            "text-base font-medium leading-tight",
                            item.checked && "line-through text-ink-soft"
                          )}
                        >
                          {item.name}
                        </p>
                        {(item.quantity || item.unit) && (
                          <p className="text-sm text-ink-soft tabular-nums mt-0.5">
                            {item.quantity}
                            {item.unit && ` ${item.unit}`}
                          </p>
                        )}
                      </div>
                    </button>
                    <button
                      onClick={() => moveToHome(item)}
                      disabled={isPending}
                      title="Finns redan hemma → flytta till skafferi/kyl/frys"
                      className="icon-btn icon-btn-rust shrink-0"
                    >
                      <Home size={18} />
                    </button>
                    <button
                      onClick={() => remove(item)}
                      disabled={isPending}
                      title="Ta bort"
                      className="icon-btn icon-btn-danger shrink-0"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
