"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { X, Camera, Check } from "lucide-react";

export function BarcodeScanner({
  target,
  onClose,
}: {
  target: "pantry" | "always_have";
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(true);
  const [last, setLast] = useState<{ name: string; ean: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const reader = new BrowserMultiFormatReader();
    readerRef.current = reader;
    let stopped = false;

    (async () => {
      try {
        const devices = await BrowserMultiFormatReader.listVideoInputDevices();
        const back = devices.find((d) => /back|rear|environment/i.test(d.label)) ?? devices[0];
        if (!back) {
          setError("Hittade ingen kamera. Använd telefon i stället för dator.");
          return;
        }
        if (stopped) return;
        await reader.decodeFromVideoDevice(back.deviceId, videoRef.current!, async (result, _err, controls) => {
          if (stopped || !result) return;
          const ean = result.getText();
          if (!/^\d{8,14}$/.test(ean)) return;
          controls.stop();
          setScanning(false);
          setBusy(true);
          try {
            const r = await fetch("/api/barcode", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ ean, target }),
            });
            const j = await r.json();
            if (!r.ok) {
              setError(j.error ?? "Kunde inte spara");
            } else {
              setLast({ name: j.product?.name ?? `EAN ${ean}`, ean });
              router.refresh();
            }
          } finally {
            setBusy(false);
          }
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Kameran kunde inte startas";
        setError(`Kamerafel: ${msg}. På iPhone måste du tillåta kamera-åtkomst i Safari → Inställningar.`);
      }
    })();

    return () => {
      stopped = true;
      // Stoppa kameran
      const stream = videoRef.current?.srcObject as MediaStream | null;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [target, router]);

  function scanAnother() {
    setLast(null);
    setScanning(true);
    // Re-trigger via re-mount
    window.location.reload();
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-espresso text-cream">
      <div className="flex items-center justify-between px-4 py-3 border-b border-cream/15">
        <p className="eyebrow text-cream/70">
          Scanna {target === "always_have" ? "till alltid-hemma" : "till skafferiet"}
        </p>
        <button onClick={onClose} className="text-cream/70 hover:text-cream"><X size={20} /></button>
      </div>

      <div className="flex-1 flex items-center justify-center relative">
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          playsInline
          muted
        />
        {scanning && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-72 h-32 border-2 border-rust rounded-sm" />
          </div>
        )}
        {busy && (
          <div className="absolute inset-0 flex items-center justify-center bg-espresso/70">
            <p className="text-cream font-display text-2xl">Slår upp...</p>
          </div>
        )}
        {last && (
          <div className="absolute inset-x-4 bottom-24 card text-espresso p-5">
            <div className="flex items-start gap-3">
              <Check className="text-forest shrink-0 mt-0.5" size={18} />
              <div className="flex-1">
                <p className="font-medium">{last.name}</p>
                <p className="text-xs text-ink-soft mt-0.5">EAN {last.ean} · sparat</p>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={scanAnother} className="btn btn-primary flex-1 justify-center text-xs">
                <Camera size={12} /> Scanna nästa
              </button>
              <button onClick={onClose} className="btn btn-ghost flex-1 justify-center text-xs">
                Klar
              </button>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="px-6 py-4 text-sm bg-burgundy/30">{error}</div>
      )}
    </div>
  );
}

export function ScanButton({ target, label }: { target: "pantry" | "always_have"; label?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)} className="btn btn-ghost text-xs">
        <Camera size={12} />
        {label ?? "Scanna streckkod"}
      </button>
      {open && <BarcodeScanner target={target} onClose={() => setOpen(false)} />}
    </>
  );
}
