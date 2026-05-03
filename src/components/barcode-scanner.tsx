"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { BrowserMultiFormatReader, type IScannerControls } from "@zxing/browser";
import { X, Camera, Check, Package, Refrigerator, Snowflake } from "lucide-react";
import { cn } from "@/lib/utils";

type Storage = "skafferi" | "kyl" | "frys";

interface ScannedItem {
  id?: string;
  name: string;
  ean: string;
  storage: Storage;
}

export function BarcodeScanner({ onClose }: { onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(true);
  const [last, setLast] = useState<ScannedItem | null>(null);
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  const startScanner = useCallback(async () => {
    setScanning(true);
    setError(null);
    try {
      const reader = new BrowserMultiFormatReader();
      const devices = await BrowserMultiFormatReader.listVideoInputDevices();
      const back =
        devices.find((d) => /back|rear|environment/i.test(d.label)) ?? devices[0];
      if (!back) {
        setError("Hittade ingen kamera. Använd telefon i stället för dator.");
        return;
      }
      const controls = await reader.decodeFromVideoDevice(
        back.deviceId,
        videoRef.current!,
        async (result) => {
          if (!result) return;
          const ean = result.getText();
          if (!/^\d{8,14}$/.test(ean)) return;
          controls.stop();
          controlsRef.current = null;
          setScanning(false);
          setBusy(true);
          try {
            const r = await fetch("/api/barcode", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ ean }),
            });
            const j = await r.json();
            if (!r.ok) {
              setError(j.error ?? "Kunde inte spara");
            } else {
              setLast({
                name: j.product?.name ?? `EAN ${ean}`,
                ean,
                storage: (j.product?.storage ?? "skafferi") as Storage,
              });
              router.refresh();
            }
          } catch (e) {
            setError(e instanceof Error ? e.message : "Spar-fel");
          } finally {
            setBusy(false);
          }
        }
      );
      controlsRef.current = controls;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Kameran kunde inte startas";
      setError(
        `Kamerafel: ${msg}. På iPhone måste du tillåta kamera-åtkomst i Safari → Inställningar → Sondag.`
      );
    }
  }, [router]);

  useEffect(() => {
    void startScanner();
    return () => {
      controlsRef.current?.stop();
      controlsRef.current = null;
      const stream = videoRef.current?.srcObject as MediaStream | null;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [startScanner]);

  function scanAnother() {
    setLast(null);
    void startScanner();
  }

  const STORAGE_META: Record<Storage, { Icon: typeof Package; label: string }> = {
    skafferi: { Icon: Package, label: "Skafferi" },
    kyl: { Icon: Refrigerator, label: "Kyl" },
    frys: { Icon: Snowflake, label: "Frys" },
  };
  const Icon = last ? STORAGE_META[last.storage].Icon : Package;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-espresso text-cream">
      <div className="flex items-center justify-between px-4 py-3 border-b border-cream/15">
        <p className="eyebrow text-cream/70">Scanna streckkod</p>
        <button onClick={onClose} className="text-cream/70 hover:text-cream">
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 flex items-center justify-center relative">
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          playsInline
          muted
        />
        {scanning && !busy && !last && (
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
                <p className="text-xs text-ink-soft mt-0.5 flex items-center gap-1.5">
                  <Icon size={11} />
                  Sparad i {STORAGE_META[last.storage].label.toLowerCase()} · EAN {last.ean}
                </p>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={scanAnother}
                className="btn btn-primary flex-1 justify-center text-xs"
              >
                <Camera size={12} /> Scanna nästa
              </button>
              <button
                onClick={onClose}
                className="btn btn-ghost flex-1 justify-center text-xs"
              >
                Klar
              </button>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="px-6 py-4 text-sm bg-burgundy/30">
          {error}
          <button
            onClick={() => void startScanner()}
            className="block mt-2 text-cream underline"
          >
            Försök igen
          </button>
        </div>
      )}
    </div>
  );
}

export function ScanButton({ label }: { label?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)} className="btn btn-ghost text-xs">
        <Camera size={12} />
        {label ?? "Scanna streckkod"}
      </button>
      {open && <BarcodeScanner onClose={() => setOpen(false)} />}
    </>
  );
}
