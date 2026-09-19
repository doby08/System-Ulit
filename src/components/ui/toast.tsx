"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { X, CheckCircle, AlertCircle, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

export type ToastType = "success" | "error" | "warning" | "info";

export interface Toast {
  id: string;
  title: string;
  message?: string;
  type: ToastType;
  duration?: number;
}

interface ToastContextType {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, "id">) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return {
    toast: (toast: Omit<Toast, "id">) => ctx.addToast(toast),
  };
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((toast: Omit<Toast, "id">) => {
    const id = Math.random().toString(36).slice(2, 9);
    const full: Toast = { ...toast, id, duration: toast.duration ?? 4000 };
    setToasts((prev) => [...prev, full]);
    if (full.duration && full.duration > 0) {
      setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), full.duration);
    }
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <ToasterInternal toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
}

function ToasterInternal({ toasts, removeToast }: { toasts: Toast[]; removeToast: (id: string) => void }) {
  const icons = {
    success: CheckCircle,
    error: AlertCircle,
    warning: AlertCircle,
    info: Info,
  };
  const colors = {
    success: "text-emerald-400",
    error: "text-rose-400",
    warning: "text-amber-400",
    info: "text-cyan-400",
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3">
      <AnimatePresence>
        {toasts.map((toast) => {
          const Icon = icons[toast.type];
          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 100, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 100, scale: 0.9 }}
              transition={{ duration: 0.2 }}
              className={cn(
                "flex items-start gap-3 p-4 rounded-xl border text-sm max-w-sm",
                "bg-[rgb(var(--bg-card))] border-[var(--border-subtle)]",
                "shadow-[var(--shadow-glow)]",
              )}
            >
              <Icon className={cn("w-5 h-5 shrink-0 mt-0.5", colors[toast.type])} />
              <div>
                <p className="font-medium text-[var(--text-primary)]">{toast.title}</p>
                {toast.message && <p className="text-xs text-[var(--text-secondary)] mt-1">{toast.message}</p>}
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="ml-auto text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

export { ToastProvider as Toaster };
