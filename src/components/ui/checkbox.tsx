"use client";

import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

export function Checkbox({ checked, onChange, className, disabled, ...props }: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  className?: string;
  disabled?: boolean;
} & React.HTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={cn(
        "w-5 h-5 rounded border-2 flex items-center justify-center transition-all duration-200",
        checked
          ? "bg-indigo-500 border-indigo-500 text-white"
          : "bg-[rgb(var(--bg-base))] border-[var(--border-subtle)] hover:border-[var(--border-strong)]",
        disabled && "opacity-50 cursor-not-allowed",
        className,
      )}
      {...props}
    >
      {checked && <Check className="w-3 h-3" />}
    </button>
  );
}
