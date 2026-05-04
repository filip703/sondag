"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, AlertTriangle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastVariant = "success" | "error" | "info";

interface Toast {
  id: string;
  message: string;
  variant: ToastVariant;
  action?: { label: string; onClick: () => void | Promise<void> };
  duration: number;
}

interface ToastContextValue {
  show: (
    message: string,
    opts?: {
      variant?: ToastVariant;
      action?: Toast["action"];
      duration?: number;
    }
  ) => void;
  success: (message: string, opts?: Omit<Parameters<ToastContextValue["show"]>[1], "variant">) => void;
  error: (message: string, opts?: Omit<Parameters<ToastContextValue["show"]>[1], "variant">) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within <ToastProvider>");
  return ctx;
}

const VARIANT_META: Record<ToastVariant, { Icon: typeof CheckCircle2; color: string; bg: string }> = {
  success: { Icon: CheckCircle2, color: "text-forest", bg: "bg-cream-light border-forest/30" },
  error: { Icon: AlertTriangle, color: "text-burgundy", bg: "bg-cream-light border-burgundy/30" },
  info: { Icon: Info, color: "text-petrol", bg: "bg-cream-light border-petrol/30" },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const dismiss = useCallback((id: string) => {
    setToasts((curr) => curr.filter((t) => t.id !== id));
  }, []);

  const show = useCallback<ToastContextValue["show"]>(
    (message, opts = {}) => {
      const id = Math.random().toString(36).slice(2);
      const duration = opts.duration ?? (opts.action ? 6000 : 3500);
      const toast: Toast = {
        id,
        message,
        variant: opts.variant ?? "info",
        action: opts.action,
        duration,
      };
      setToasts((curr) => [...curr, toast]);
      setTimeout(() => dismiss(id), duration);
    },
    [dismiss]
  );

  const success = useCallback<ToastContextValue["success"]>(
    (m, opts) => show(m, { ...opts, variant: "success" }),
    [show]
  );
  const error = useCallback<ToastContextValue["error"]>(
    (m, opts) => show(m, { ...opts, variant: "error" }),
    [show]
  );

  const viewport = (
    <div className="fixed bottom-0 right-0 z-[200] flex flex-col gap-2 p-4 max-w-md w-full pointer-events-none">
      {toasts.map((t) => {
        const meta = VARIANT_META[t.variant];
        return (
          <div
            key={t.id}
            className={cn(
              "pointer-events-auto flex items-start gap-3 px-4 py-3 border shadow-md rounded-sm",
              "animate-[slideIn_180ms_ease-out]",
              meta.bg
            )}
            role="status"
          >
            <meta.Icon size={18} className={cn("shrink-0 mt-0.5", meta.color)} />
            <div className="flex-1 text-sm leading-snug">{t.message}</div>
            {t.action && (
              <button
                onClick={async () => {
                  await t.action!.onClick();
                  dismiss(t.id);
                }}
                className="text-rust text-sm font-medium hover:underline shrink-0"
              >
                {t.action.label}
              </button>
            )}
            <button
              onClick={() => dismiss(t.id)}
              className="text-ink-soft hover:text-espresso shrink-0 -my-1"
              aria-label="Stäng"
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );

  return (
    <ToastContext.Provider value={{ show, success, error }}>
      {children}
      {mounted && createPortal(viewport, document.body)}
    </ToastContext.Provider>
  );
}
