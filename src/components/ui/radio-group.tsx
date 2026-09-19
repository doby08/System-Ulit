"use client";

import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

export interface RadioOption {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
  icon?: React.ReactNode;
}

interface RadioGroupProps {
  value?: string;
  onChange: (value: string) => void;
  options: RadioOption[];
  className?: string;
  label?: string;
  direction?: "vertical" | "horizontal";
}

export function RadioGroup({ value, onChange, options, className, label, direction = "vertical" }: RadioGroupProps) {
  return (
    <div className={cn("space-y-2", className)}>
      {label && <span className="label block">{label}</span>}
      <div className={cn("flex flex-col gap-2", direction === "horizontal" && "flex-row gap-3")}>
        {options.map((opt) => (
          <label
            key={opt.value}
            className={cn(
              "flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all",
              "border-[var(--border-subtle)] hover:bg-[var(--bg-hover)]",
              value === opt.value && "border-indigo-500/50 bg-[rgba(99,102,241,0.08)]",
              opt.disabled && "opacity-50 cursor-not-allowed",
            )}
          >
            <input
              type="radio"
              name="radio"
              value={opt.value}
              checked={value === opt.value}
              onChange={() => onChange(opt.value)}
              disabled={opt.disabled}
              className="sr-only"
            />
            <div className={cn(
              "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors",
              value === opt.value ? "border-indigo-500 bg-indigo-500" : "border-[var(--border-subtle)]",
            )}>
              {value === opt.value && <div className="w-2 h-2 rounded-full bg-white" />}
            </div>
            <div className="flex-1">
              <span className="text-sm font-medium text-[var(--text-primary)]">{opt.label}</span>
              {opt.description && <p className="text-xs text-[var(--text-secondary)]">{opt.description}</p>}
            </div>
            {opt.icon}
          </label>
        ))}
      </div>
    </div>
  );
}
