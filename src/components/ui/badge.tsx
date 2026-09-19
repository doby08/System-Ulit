import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

export function Badge({ className, variant = "default", ...props }: HTMLAttributes<HTMLDivElement> & {
  variant?: "default" | "success" | "warning" | "error" | "info" | "outline";
}) {
  const variants = {
    default: "bg-[rgba(99,102,241,0.12)] text-indigo-200 border border-[var(--border-subtle)]",
    success: "bg-emerald-500/15 text-emerald-200 border border-emerald-400/30",
    warning: "bg-amber-500/15 text-amber-200 border border-amber-400/30",
    error: "bg-rose-500/15 text-rose-200 border border-rose-400/30",
    info: "bg-cyan-500/15 text-cyan-200 border border-cyan-400/30",
    outline: "text-[var(--text-secondary)] border border-[var(--border-subtle)]",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
