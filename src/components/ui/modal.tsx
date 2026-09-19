"use client";

import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  size?: "sm" | "md" | "lg" | "xl" | "full";
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function Modal({ open, onClose, title, description, size = "md", children, footer }: ModalProps) {
  const sizes = {
    sm: "max-w-sm",
    md: "max-w-2xl",
    lg: "max-w-4xl",
    xl: "max-w-6xl",
    full: "max-w-7xl",
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2 }}
            className={cn(
              "bg-[rgb(var(--bg-card))] border border-[var(--border-subtle)] rounded-[var(--radius-card)] shadow-[var(--shadow-glow)]",
              "flex flex-col max-h-[90vh]",
              sizes[size],
              "w-full mx-4",
            )}
            onClick={(e) => e.stopPropagation()}
          >
            {(title || description) && (
              <div className="px-6 py-4 border-b border-[var(--border-subtle)]">
                {title && <h3 className="text-lg font-semibold text-[var(--text-primary)]">{title}</h3>}
                {description && <p className="text-sm text-[var(--text-secondary)] mt-1">{description}</p>}
              </div>
            )}
            <div className="px-6 py-4 overflow-y-auto flex-1 min-h-0">{children}</div>
            {footer && <div className="px-6 py-4 border-t border-[var(--border-subtle)] flex justify-end gap-2">{footer}</div>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function ModalCloseButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
    >
      <X className="w-5 h-5" />
    </button>
  );
}
