"use client";

import { cn } from "@/lib/utils";
import { useState, useRef, useEffect } from "react";
import { Check, ChevronDown } from "lucide-react";

export interface SelectOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
  disabled?: boolean;
}

interface SelectProps {
  value?: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  label?: string;
}

export function Select({ value, onChange, options, placeholder, className, disabled, label }: SelectProps) {
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className={cn("relative", className)} ref={containerRef}>
      {label && <span className="label">{label}</span>}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(!open)}
        className={cn(
          "w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-sm",
          "bg-[rgb(var(--bg-base))] border border-[var(--border-subtle)]",
          "text-[var(--text-primary)] outline-none transition-all duration-200",
          "focus:border-[var(--border-strong)] focus:ring-2 focus:ring-[rgba(99,102,241,0.25)]",
          open && "border-[var(--border-strong)] ring-2 ring-[rgba(99,102,241,0.25)]",
        )}
      >
        <span className={cn("flex items-center gap-2", !selected && "text-[var(--text-muted)]")}>
          {selected?.icon}
          {selected ? selected.label : placeholder ?? "Select..."}
        </span>
        <ChevronDown className="w-4 h-4 text-[var(--text-muted)] transition-transform" style={{ transform: open ? "rotate(180deg)" : "none" }} />
      </button>

      {open && (
        <div className="absolute z-50 mt-2 w-full bg-[rgb(var(--bg-card))] border border-[var(--border-subtle)] rounded-xl shadow-[var(--shadow-glow)] max-h-64 overflow-y-auto">
          {options.map((opt, i) => (
            <button
              key={opt.value}
              type="button"
              disabled={opt.disabled}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors",
                "hover:bg-[var(--bg-hover)]",
                opt.value === value && "bg-[rgba(99,102,241,0.12)]",
                opt.disabled && "opacity-50 cursor-not-allowed",
              )}
              onMouseEnter={() => setHighlighted(i)}
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
            >
              {opt.icon}
              <span>{opt.label}</span>
              {opt.value === value && <Check className="w-4 h-4 ml-auto text-indigo-400" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
